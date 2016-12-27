/**
 * Set to true when testing locally.
 * @define {boolean}
 */
var DEBUG = false;
/**
 * Prevent the Guacamole client from timing-out while debugging.
 * @define {boolean}
 */
var DEBUG_NO_TIMEOUT = false;
/**
 * Disable the NSFW warning.
 * @define {boolean}
 */
var DEBUG_NO_NSFW = false;
/**
 * Disable connecting to the WebSocket server.
 * @define {boolean}
 */
var DEBUG_NO_CONNECT = false;
/** @define {boolean} */
var DEBUG_LOADING = false;
/** @define {boolean} */
var DEBUG_VM_LIST = false;
/** @define {boolean} */
var DEBUG_VM_VIEW = false;

/** @const
 * Max number of characters in a chat message.
 */
var maxChatMsgLen = 100;

/** @const
 * Max number of chat messages to store.
 */
var maxChatMsgHistory = 100;

/**
 * Whether the user has control over the VM or not.
 * @type {boolean}
 */
var hasTurn = false;
var turnInterval = null;
var voteInterval = null;
var uploadInterval = null;
/**
 * Whether the user has voted or not.
 * @type {boolean}
 */
var hasVoted;
var focused = false;
var display;
var tunnel;
var guac;
var mouse;
var keyboard;
var audioSupported;
var fileApisSupported;
var blurSupported;
var chatSoundOn = true;
var maxUploadSize = 4096;
var maxUploadNameLen = 100;

/** @const
 * The maximum size of a file chunk that can be sent
 * when uploading a file.
 */
var uploadChunkSize = 4096;

/**
 * The current on-screen keyboard, if any.
 * @type Guacamole.OnScreenKeyboard
 */
var osk = null;
/** Whether the NSFW warning is currently visible.
 * @type {boolean}
 */
var nsfwWarn = true;
// WaitingIndex = 0, Not waiting
// 1 = HasTurn
// >1 = Index in line
var users = [];
// Number of users in queue plus one
var usersWaiting = 0;
// Name: [UserRank, WaitingIndex]
/** {dict} */
var usersData = {};
/** {dict} */
var usersList = {};
/** @type {string} */
var username = null;
/**
 * The name of the VM that the user is currently viewing 
 * or trying to view.
 * @type {string}
 */
var vmName;
/**
 * Whether the client is connecting to a VM and viewing it.
 * @type {boolean}
 */
 var connected = false;
/**
 * Whether the urlChange function has been called since
 * the page has been loaded.
 * @type {boolean}
 */
var urlChangeCalled;
 
 /** @const
  * The root directory of the collab-vm project with a
  * forward slash appended to it.
  * This is determined at runtime to allow the project to be
  * relocated without needing to recompile the javascript.
  * @type {string}
  */
var rootDir = "/collab-vm/";
/** @const {string} */
var viewDir = "view";

/** @const
 * The name of the chat sound.
 */
var chatSound =  rootDir + "notify";

/**
 * File upload operation.
 * @enum {number}
 */
var fileOp = {
	BEGIN: 0,
	MIDDLE: 1,
	END: 2,
	STOP: 3
}

/**
 * File upload response from server.
 * @enum {number}
 */
var fileResponse = {
	BEGIN: 0,
	ACK: 1,
	FINISHED: 2,
	STOP: 3,
	WAIT_TIME: 4,
	FAILED: 5,
	UPLOAD_IN_PROGRESS: 6,
	TIMED_OUT: 7
}

/**
 * Whether the page is a view page for viewing a VM.
 * @type {boolean}
 */
var viewPage;

function isViewPage() {
	return viewPage = !!window.location.pathname.match("^" + rootDir + viewDir + "/");
}

/**
 * Gets the CSS class associated with a user rank.
 * @param {number} rank
 * @return {string}
 */
function getRankClass(rank) {
	switch (rank) {
		default:
		case 0: // Guest
			return "";
		case 1: // Registered user
			return "user";
		case 2: // Admin
			return "admin";
	}
}

function addTableRow(table, user, userData) {
	var data = document.createElement("LI");
	data.className = "list-group-item";
	data.innerHTML = user;
	var rank = getRankClass(userData[0]);
	if (rank)
		data.className += " " + rank;
	if (userData[1] === 1) {
		data.className += " has-turn";
	} else if (userData[1] > 1) {
		data.className += " waiting-turn";
	}
	if (user == username)
		data.className += " current-user";
	table.appendChild(data);
}

function displayTable() {
	$("#users-online").html(users.length);
	var table = $("#online-users").empty().get(0);
	
	if (usersWaiting > 0) {
		for (var x = 1; x < usersWaiting+1; x++) {
			for (var i = 0; i < users.length; i++) {
				var user = users[i];
				var userData = usersData[user];
				if (userData[1] === x)
					addTableRow(table, user, userData);
			}
		}
		for (var i = 0; i < users.length; i++) {
			var user = users[i];
			var userData = usersData[user];
			if (userData[1] === 0)
				addTableRow(table, user, userData);
		}
	} else {
		for (var i = 0; i < users.length; i++) {
			var user = users[i];
			var userData = usersData[user];
			addTableRow(table, user, userData);
		}
	}
}

function chatMessage(username, message) {
	var chatPanel = $("#chat-panel").get(0);
	var atBottom = chatPanel.offsetHeight + chatPanel.scrollTop >= chatPanel.scrollHeight;
	var chatElement = $('<li><div></div></li>');
	if (username)
		chatElement.children().first().html(message).prepend($('<span class="username"></span>').text(username), '<span class="spacer">\u25B8</span>');
	else
		chatElement.children().first().addClass("server-message").html(message);
	var chatBox = $("#chat-box");
	var children = chatBox.children();
	if (children.length >= maxChatMsgHistory)
		children.first().remove();
	chatBox.append(chatElement);
	if (atBottom)
		chatPanel.scrollTop = chatPanel.scrollHeight;
	playSound();
}

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for(var i=0; i<ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1);
		if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
	}
	return "";
}

function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays*24*60*60*1000));
	var expires = "expires="+d.toUTCString();
	document.cookie = cname + "=" + cvalue + "; " + expires;
}

function initSound() {
	if (!!document.createElement('audio').canPlayType) {
		var a = document.createElement('audio');
		if (!!(a.canPlayType('audio/mpeg;').replace(/no/, ""))) {
			audioSupported = new Audio(chatSound + ".mp3");
		} else if (!!(a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ""))) {
			audioSupported = new Audio(chatSound + ".ogg");
		} else if (!!(a.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, ""))) {
			audioSupported = new Audio(chatSound + ".m4a");
		}
	}
}

function setChatSoundOn(on) {
	chatSoundOn = on;
	if (chatSoundOn) {
		$("#chat-sound-btn").children().first().removeClass("glyphicon-volume-off").addClass("glyphicon-volume-up");
	} else {
		$("#chat-sound-btn").children().first().removeClass("glyphicon-volume-up").addClass("glyphicon-volume-off");
	}
}

function playSound() {
	if (chatSoundOn) {
		if (audioSupported !== null) {
			audioSupported.play();
		} else {
			$("#chat-sound bgsound").remove();
			$("<bgsound/>").attr({ src: "notify.mp3", loop: 1, autostart: true }).appendTo("#chat-sound");
		}
	}
}

/**
 * Create a timer that calls the callback every second.
 * @param callback The function that is called every second with the following declaration:
 *				function(seconds, dots)
 *				@param seconds The number of seconds remaining or null if the timer has expired
 *				@param dots A string with 0 to 4 dots to indicate progress
 * @param ms The number of milliseconds the timer should start with.
 * @return The intervalID from setInterval()
 */
function waitingTimer(callback, ms, completion) {
	var interval;
	var dots = '';
	var timerCallback = function() {
			var seconds = Math.floor(ms / 1000);
			if (seconds <= 0) {
				clearInterval(interval);
				callback(null);
			} else {
				if (dots.length < 3)
					dots += '.';
				else
					dots = '';
				callback(seconds, dots);
			}
		};
	timerCallback();
	return interval = setInterval(function() { ms -= 1000; timerCallback(); }, 1000);
}

function setFocus(focus) {
	focused = focus;
	if (focus) {
		keyboard.onkeydown = function (keysym) {
			if (hasTurn)
				guac.sendKeyEvent(1, keysym);
			};

		keyboard.onkeyup = function (keysym) {
			if (hasTurn)
				guac.sendKeyEvent(0, keysym);
			};

	} else {
		keyboard.onkeydown = keyboard.onkeyup = null;
	}
}

/**
 * Enables or disables the on-screen keyboard.
 * @param {boolean} enabled
 */
function activateOSK(enabled) {
	osk.disabled = !enabled;
	var keys = $(osk.getElement()).find("div.guac-keyboard-key");
	if (enabled)
		keys.removeClass("guac-keyboard-disabled");
	else
		keys.addClass("guac-keyboard-disabled");
}

/**
 * Shows or hides the NSFW warning message.
 * @param {boolean=} show False if the NSFW warning message should be hidden. Defaults to true.
 */
function displayNsfwWarn(show) {
	if (show === false) {
		$("#display").removeClass("censor").removeClass("censor-fallback");
		$("#vm-list img").removeClass("censor").removeClass("censor-fallback");
		$("#warning").hide();
		nsfwWarn = false;
	} else {
		// First try to use the blur filter to the display
		var el = $("#display");
		// Add the filter-blur property to the element
		el.addClass("censor");
		// Check whether the style is computed or ignored
		blurSupported = el.css("filter") || el.css("-webkit-filter");
		if (blurSupported) {
			//checking for false positives of IE
			blurSupported = (document.documentMode === undefined //non-IE browsers, including ancient IEs
				|| document.documentMode > 9 //IE compatibility mode
				);
		}
		// Cover it with white if blur is not supported
		if (!blurSupported)
			el.addClass("censor-fallback");
		$("#warning").show();
		// TODO: Apply blur to any existing thumbnails in the VM list?
		nsfwWarn = true;
	}
}

/**
 * Shows or hides the loading animation.
 * @param {boolean=} show False if the loading animation should be hidden. Defaults to true.
 */
function displayLoading(show) {
	if (show === false) {
		$("#loading").hide();
		$("#status").html("");
	} else {
		$("#loading").show();
		$("#status").html("Loading...");
	}
}

/**
 * Shows or hides the VM list.
 * @param {boolean=} show False if the VM list should be hidden. Defaults to true.
 */
function displayVMList(show) {
	if (show === false) {
		$("#vm-list").empty().hide();
	} else {
		$("#vm-view").hide();
		$("#vm-list").empty().show();
	}
}

/**
 * Shows or hides the VM viewer.
 * @param {boolean=} show False if the VM viewer should be hidden. Defaults to true.
 */
function displayVMView(show) {
	if (show === false) {
		$("#vm-view").hide();
	} else {
		$("#vm-list").hide();
		$("#vm-view").show();
		osk.resize($("#kbd-container").width());
	}
}

/**
 * Displays a list of VMs along with their thumbnails and names.
 * @param {Array<string>} list An array consisting of 3 values for each VM:
 * the short name, the display name, and the base64-encoded thumbnail.
 */
function updateVMList(list) {
	var vmList = $("#vm-list");
	if (list.length) {
		for (var i = 0; i < list.length; i += 3) {
			var e = $('<div class="col-sm-6 col-md-4"><a class="thumbnail" href="' + rootDir + viewDir + "/" + list[i] + '">' +
				(list[i+2] ? '<img src="data:image/png;base64,' + list[i+2] + '"/>' : "") +
				'<div class="caption"><h4>' + list[i+1] + '</h4></div></a></div>');
			// Add click handler to anchor tag for history
			e.children().first().click(function(e) {
				// Check that the link was clicked with the left mouse button
				if (e.which === 1) {
					e.preventDefault();
					History.pushState(null, null, this.getAttribute("href"));
				}
			});
			// If there is an image and the NSFW warning is visible, it should be censored
			if (nsfwWarn && list[i+2])
				e.children().first().children().first().addClass(blurSupported ? "censor" : "censor-fallback");
			vmList.append(e);
		}
	} else {
		vmList.html("No VMs online");
	}
}

function getVMList() {
	displayLoading();
	displayVMList();
	if (tunnel && tunnel.state === Guacamole.Tunnel.State.OPEN) {
		// Disconnect if we are connected
		if (connected)
			tunnel.sendMessage("connect");
		tunnel.sendMessage("list");
	}
}

/**
 * Update vote stats.
 */
function setVoteStats(parameters) {
	debugLog(parameters);
	$("#vote-label-yes").html(parameters[2]);
	$("#vote-label-no").html(parameters[3]);
	if (voteInterval)
		clearInterval(voteInterval);
	var ms = parseInt(parameters[1]);
	var voteStatus = function() {
		ms -= 1000;
		var seconds = Math.floor(ms / 1000);
		if (seconds <= 0) {
			clearInterval(voteInterval);
		} else {
			$("#vote-time").html(seconds);
		}
	};
	voteStatus();
	$("#vote-stats").show();
	
	voteInterval = setInterval(voteStatus, 1000);

	if (!hasVoted) {
		$("#vote-alert").show();
	}
}

/**
 * Update the actions available to the user.
 */
function updateActions(parameters) {
	// Turns enabled
	// if (parameters[0] === "1")
	
	// Voting enabled
	if (parameters[1] === "1")
		$("#vote-btn").show();
	else
		$("#vote-btn").hide();
	
	// Uploads enabled
	if (parameters[2] === "1") {
		$("#upload-options-btn").show();
		maxUploadSize = parseInt(parameters[3]);
		maxUploadNameLen = parseInt(parameters[4]);
		if (uploadInterval === null && $("#upload-input")[0].files.length)
			$("#upload-btn, #upload-input").prop("disabled", false);
	} else {
		$("#upload-options-btn").hide();
		$("#file-upload").hide("fast");
	}
}

function startFileUpload(uploadId) {
	var files = $("#upload-input")[0].files;
	if (files.length !== 1)
		return;
	var file = files[0];
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://" + serverAddress + "/upload?" + uploadId, true);
	xhr.responseType = "text";
	xhr.setRequestHeader("Content-Type", "application/octet-stream");
	//xhr.onload = function(e) { console.log(xhr.response); };
	var progressBar = document.getElementById("upload-progress");
	xhr.upload.onprogress = function(e) {
		if (e.lengthComputable) {
			var progress = (e.loaded / e.total) * 100;
			$("#upload-wait-time").html("Uploading... (" + Math.round(progress) + "%)");
		}
	  };
	xhr.send(file);
}

function displayUploadWaitTime(waitTime) {
	if (waitTime > 0) {
		$("#upload-btn").prop("disabled", true);
		if (uploadInterval !== null)
			clearInterval(uploadInterval);
		uploadInterval = waitingTimer(function(seconds) {
				if (seconds !== null) {
					$("#upload-wait-time").html("Please wait " + seconds + " seconds before uploading another file.");
				} else {
					uploadInterval = null;
					$("#upload-wait-time").html("");
					$("#upload-input").prop("disabled", false);
					if ($("#upload-input")[0].files.length)
						$("#upload-btn").prop("disabled", false);
				}
			}, waitTime);
	} else {
		$("#upload-wait-time").html("");
		$("#upload-btn, #upload-input").prop("disabled", false);
	}
}

function urlChange() {
	var r = History.getState().url.match("(?:(?://)[^/]*)*" + rootDir + "(.*)");
	if (r) {
		if (!r[1] || r[1] === viewDir + "/") {
			vmName = null;
			getVMList();
			urlChangeCalled = true;
			return;
		} else if (r[1].match("^" + viewDir + "/.+")) {
			displayLoading();
			vmName = r[1].substring((viewDir + "/").length);
			// If we are connected to the server, try to view the VM,
			// otherwise wait for a connection to be made
			if (tunnel && tunnel.state === Guacamole.Tunnel.State.OPEN)
				tunnel.sendMessage("connect", vmName);
			urlChangeCalled = true;
			return;
		}
	}
	// Unknown URL so redirect to it
	window.location.href = History.getState().url;
}

$(window).on("statechange", function() {
	debugLog("statechange callled");
	urlChange();
});
	
$(function() {
	// Determine the root path of collab-vm
	//rootDir = window.location.pathname.match("(/(?:[^/]*/)*)")[1];
	// Check if the path ends with the view directory
	// and remove it if it does
	/*if (rootDir.match("/" + viewDir + "/$")) {
		rootDir = rootDir.substring(0, rootDir.length - ("/" + viewDir + "/").length + 1);
	}*/
	//if (window.location.pathname.)
	if (!DEBUG)
		urlChange();
	// Try to set the text shadow property for the NSFW warning so it can
	// be seen on dark backgrounds
	var warnText = $("#warn-text");
	if (!warnText.css("text-shadow", "2px 2px #fff").css("text-shadow")) {
		// If the property is not supported, set the background color to white
		warnText.css("background-color", "white");
	}
	
	$("#nsfw-cont-btn").click(function() {
		displayNsfwWarn(false);
		if ($("#no-warn-chkbox").prop("checked")) {
			setCookie("no-nsfw-warn", "1", 365);
		}
	});
	
	osk = new Guacamole.OnScreenKeyboard(en_us_qwerty_keyboard);
	activateOSK(false);
	$("#kbd-keys").append(osk.getElement());
	
	osk.onkeydown = function(keysym) {
		if (hasTurn)
			guac.sendKeyEvent(1, keysym);
	};
	
	osk.onkeyup = function(keysym) {
		if (hasTurn)
			guac.sendKeyEvent(0, keysym);
	};
	
	$("#osk-btn").click(function() {
		var kbd = $("#kbd-outer");
		if (kbd.is(":visible"))
			kbd.hide("fast");
		else
			kbd.show("fast");
	});
	
	$(window).resize(function() {
		if (osk)
			osk.resize($("#kbd-container").width());
	});
	
	$("#vote-btn").click(function() {
		hasVoted = true;
		tunnel.sendMessage("vote", "1");
	});
	
	$("#vote-yes").click(function() {
		if (!hasVoted) {
			hasVoted = true;
			tunnel.sendMessage("vote", "1");
			$("#vote-alert").hide();
		}
	});
	
	$("#vote-no").click(function() {
		if (!hasVoted) {
			hasVoted = true;
			tunnel.sendMessage("vote", "0");
			$("#vote-alert").hide();
		}
	});
	
	$("#vote-dismiss").click(function() {
		$("#vote-alert").hide();
	});
	
	$('#username-modal').on('show.bs.modal', function (event) {
		$("#username-box").val(username);
	});

	$("#username-ok-btn").click(function() {
		var newUsername = $("#username-box").val().trim();
		if (newUsername) {
			$('#username-modal').modal("hide");
			debugLog("New Username: " + newUsername);
			// TODO: close modal when WebSocket disconnects
			if (tunnel.state == Guacamole.Tunnel.State.OPEN) {
				tunnel.sendMessage("rename", newUsername);
			}
		}
	});
	
	$("#username-box").keydown(function(e) {
		if (e.which === 13) {
			// Enter key
			e.preventDefault();
			$("#username-ok-btn").trigger("click");
		}
	});
	
	// TODO: Add drag and drop support for file uploads
	/*$("#display").on("dragenter", function(e) {
		$(this).addClass("drag");
		e.stopPropagation();
		e.preventDefault();
	});
	
	$("#display").on("dragover", function(e) {
		e.stopPropagation();
		e.preventDefault();
	});
	
	$("#display").on("dragleave", function(e) {
		$(this).removeClass("drag");
		e.stopPropagation();
		e.preventDefault();
	});*/
	
	fileApisSupported = !!(window.File && window.FileReader && window.FileList && window.Blob && window.ArrayBuffer && window.Uint8Array);
	
	$("#upload-options-btn").click(fileApisSupported ? function() {
		var fileUpload = $("#file-upload");
		if (fileUpload.is(":visible"))
			fileUpload.hide("fast");
		else
			fileUpload.show("fast");
	} : function() { alert("File uploads are not fully supported by your browser."); });
	
	if (fileApisSupported) {
		$("#upload-input").change(function(e) {
			var files = e.target.files;
			if (files.length === 1) {
				var file = files[0];
				if (file) {
					if (file.size > maxUploadSize) {
						alert("File is too big. Max file size is " + maxUploadSize + " bytes.");
					} else if (file.name.length > maxUploadNameLen) {
						alert("Filename is too long. Max filename is " + maxUploadNameLen + ".");
					} else if (/[^\x20-\x7E]|[<>:"/\\\|\?\*]/.test(file.name)) {
						alert("Filename contains characters that are not allowed.");
					} else {
						//$("#filename-box").val(file.name);
						if (uploadInterval === null) {
							$("#upload-btn").prop("disabled", false);
						}
						return;
					}
				}
			}
			this.value = null;
			$("#upload-btn").prop("disabled", true);
		});
		
		$("#upload-btn").click(function() {
			var files = $("#upload-input")[0].files;
			if (files.length !== 1)
				return;
			var file = files[0];
			tunnel.sendMessage("file", fileOp.BEGIN, file.name, file.size, $("#upload-run-chkbox").prop("checked") ? 1 : 0);
			$(this).prop("disabled", true);
			$("#upload-input").prop("disabled", true);
			$("#upload-wait-time").html("Uploading...");
		});
	}
	
	$("#home-btn").attr("href", rootDir).click(function(e) {
		// Check that the link was clicked with the left mouse button
		if (e.which === 1) {
			e.preventDefault();
			if ($("#vm-list").is(":visible")) {
				getVMList();
			} else {
				History.pushState(null, null, this.getAttribute("href"));
			}
		}
	});
	
	$("#chat-input").keypress(function(e) {
		if (e.which === 13) {
			// Enter key sends chat message
			e.preventDefault();
			$("#chat-send-btn").trigger("click");
		} else if (this.value.length >= maxChatMsgLen) {
			e.preventDefault();
		}
	}).on("input", function() {
		// Truncate chat messages that are too long
		if (this.value.length > maxChatMsgLen)
			this.value = this.value.substr(0, maxChatMsgLen);
	});
	
	$("#chat-send-btn").click(function() {
		var chat = $("#chat-input");
		var msg = chat.val().trim();
		if (guac.currentState === Guacamole.Client.CONNECTED && msg) {
			tunnel.sendMessage("chat", msg);
			chat.val("");
		}
	});
	
	$("#chat-sound-btn").click(function() {
		setChatSoundOn(!chatSoundOn);
		setCookie("chat-sound", chatSoundOn ? "1" : "0", 365);
	});
	
	initSound();
	
	setChatSoundOn(getCookie("chat-sound") != "0");

	displayNsfwWarn(!DEBUG_NO_NSFW && getCookie("no-nsfw-warn") != "1");
	
	if (DEBUG_VM_LIST) {
		displayVMList();
		updateVMList(["win-xp", "Windows XP SP3", ""/*, "win-vista", "Windows Vista", "", "win-7", "Windows 7 Professional", ""*/]);
		$("#vm-list > div > a").prepend($("<img>", {"data-src": "holder.js/300x200"}));
		Holder.run();
		return;
	} else if (DEBUG_VM_VIEW) {
		displayVMView();
		return;
	}
	
	if (DEBUG_LOADING) {
		displayLoading();
		return;
	}
	
	if (DEBUG_NO_CONNECT)
		return;
	
	// Get display div from document
	display = document.getElementById("display");

	// Instantiate client, using a websocket tunnel for communications.
	tunnel = new Guacamole.WebSocketTunnel("ws://" + serverAddress + "/");
	// Disable receive timeouts for debugging
	if (DEBUG_NO_TIMEOUT)
		tunnel.receiveTimeout = 0;

	guac = new Guacamole.Client(tunnel);
	
	guac.getDisplay().getElement().addEventListener("click", function() {
		if (!hasTurn && !nsfwWarn)
			tunnel.sendMessage("turn");
	});
	
	// Error handler
	guac.onerror = function(error) {
		debugLog(error);
	};
	
	tunnel.onstatechange = function(state) {
		if (state == Guacamole.Tunnel.State.CLOSED) {
			displayLoading();
			displayVMList(false);
			$("#username-btn").prop("disabled", true);
			activateOSK(false);
			// Remove display element
			var e = guac.getDisplay().getElement();
			if (e.parentNode == display)
				display.removeChild(e);
			// Clear VM list
			$("#vm-list").empty();
			// Reset variables
			connected = false;
			users = [];
			usersWaiting = 0;
			usersData = {};
			username = null;
			setFocus(false);
			hasTurn = false;
			if (turnInterval !== null) {
				clearInterval(turnInterval);
				turnInterval = null;
				$("#status").html("");
			}
			if (voteInterval !== null) {
				clearInterval(voteInterval);
				voteInterval = null;
			}
			display.className = "";
			displayTable();
			$("#chat-send-btn").prop("disabled", true);
			$("#chat-input").prop("disabled", true);
			$("#chat-user").hide().html("");
			// Attempt to reconnect in 10 seconds
			setTimeout(function (){tunnel.state = Guacamole.Tunnel.State.CONNECTING; guac.connect();}, 10000);
		} else if (state == Guacamole.Tunnel.State.OPEN) {
			hasVoted = false;
			displayLoading();
			
			// Request a username
			var username = getCookie("username");
			if (username)
				tunnel.sendMessage("rename", username);
			else
				tunnel.sendMessage("rename");
			
			if (vmName) {
				tunnel.sendMessage("connect", vmName);
			} else {
				displayVMList();
				tunnel.sendMessage("list");
			}
			// Add display element
			display.appendChild(guac.getDisplay().getElement());
			
			$("#chat-send-btn").prop("disabled", false);
			$("#chat-input").prop("disabled", false);
			$("#chat-user").show();

		}
	};
	
	// VM List handler
	guac.onlist = function(parameters) {
		updateVMList(parameters);
		displayLoading(false);
	};
	
	// Turn handler
	guac.onturn = function(parameters) {
		debugLog("Turn: ");
		debugLog(parameters);
		// Clear all user data
		for (var i = 0; i < users.length; i++)
			usersData[users[i]][1] = 0;

		usersWaiting = parseInt(parameters[1]);
		var num = usersWaiting + 2;
		for (var i = 2; i < num; i++) {
			usersData[parameters[i]][1] = i-1;
		}
		if (num > 2 && parameters[2] == username) {
			// The user has control
			hasTurn = true;
			display.className = "focused";
			if (turnInterval !== null)
				clearInterval(turnInterval);
			// Round the turn time up to the nearest second
			turnInterval = waitingTimer(function(seconds) {
					if (seconds !== null) {
						$("#status").html("Your turn expires " + "in ~" + seconds + " seconds");
					} else {
						turnInterval = null;
						$("#status").html("");
					}
				}, Math.round(parseInt(parameters[0])/1000)*1000);
		} else if (parameters.length > num) {
			// The user is waiting for control
			hasTurn = false;
			display.className = "waiting";
			if (turnInterval !== null)
				clearInterval(turnInterval);
			turnInterval = waitingTimer(function(seconds, dots) {
					if (seconds !== null) {
						$("#status").html("Waiting for turn " + "in ~" + seconds + " seconds" + dots);
					} else {
						turnInterval = null;
						$("#status").html("");
					}
				}, Math.round(parseInt(parameters[parameters.length-1])/1000)*1000);
		} else {
			if (hasTurn) {
				hasTurn = false;
				display.className = "";
			}
			if (turnInterval !== null) {
				clearInterval(turnInterval);
				turnInterval = null;
				$("#status").html("");
			}
		}
		activateOSK(hasTurn);
		displayTable();
	};
	
	// Rename Handler
	guac.onrename = function(parameters) {
		if (parameters[0] === "0") {
			// Change this user's username
			var newUsername = username === null;
			// Remove old username if it's in the list
			if (!newUsername) {
				for (var x = 0; x < users.length; x++) {
					if (users[x] == username) {
						users.splice(x, 1);
						break;
					}
				}
			}
			username = parameters[2];
			$("#username-btn").prop("disabled", false);
			$("#chat-user").html(username);
			// Add the username to the users array if it's not
			// already in it
			if ($.inArray(username, users) == -1)
				users.push(username);
			usersData[username] = [0, 0];
			setCookie("username", username, 365);

			// Check status
			if (parameters[1] === "1") {
				// Username taken
				alert("That username is already taken.");
			} else if (parameters[1] === "2") {
				alert("Usernames can contain only numbers, letters, spaces, dashes, underscores, and dots, and it must be between 3 and 20 characters.");
			}
		} else if (parameters[0] === "1") {
			var oldUsername = parameters[1];
			// Change another user's username
			for (var i = 0; i < users.length; i++) {
				if (users[i] == oldUsername) {
					users[i] = parameters[2];
					break;
				}
			}
			usersData[parameters[2]] = usersData[oldUsername];
			delete usersData[oldUsername];
		}
		displayTable();
	};
	
	guac.onconnect = function(parameters) {
		switch (parseInt(parameters[0])) {
			case 0: // Failed to connect
				alert("Failed to connect to VM.")
				break;
			case 1: // Connected
				updateActions(parameters.slice(1));
				$("#chat-box").empty();
				$("#vote-alert").hide();
				$("#vote-stats").hide();
				displayVMView();
				// Request the username that was stored in the cookie
				// or send an empty username for the server to generate
				// a new one
				if (username === null) {
					tunnel.sendMessage("rename", getCookie("username"));
				}
				// Successfully connected to VM
				connected = true;
				displayLoading(false);
				break;
			case 2: // Disconnected
				connected = false;
				//cancelUpload = true;
				hasTurn = false;
				if (turnInterval !== null)
					clearInterval(turnInterval);
				if (voteInterval !== null)
					clearInterval(voteInterval);
				if (uploadInterval !== null)
					clearInterval(uploadInterval);
				
				// Redirect to VM list
				History.pushState(null, null, rootDir);
				break;
		}
	};
	
	guac.onadduser = function(parameters) {
		debugLog("Add user: ");
		debugLog(parameters);
		var num = parseInt(parameters[0])*2 + 1;
		for (var i = 1; i < num; i += 2) {
			if (parameters[i] !== username) {
				users.push(parameters[i]);
				usersData[parameters[i]] = [parseInt(parameters[i+1]), 0];
			}
		}
		displayTable();
	};
	
	guac.onremuser = function(parameters) {
		debugLog("Remove user: ");
		debugLog(parameters);
		var num = parseInt(parameters[0]) + 1;
		for (var i = 1; i < num; i++) {
			var user = parameters[i];
			for (var x = 0; x < users.length; x++) {
				if (users[x] == user) {
					users.splice(x, 1);
					break;
				}
			}
			delete usersData[user];
		}
		displayTable();
	};
	
	guac.onchat = function(parameters) {
		for (var i = 0; i < parameters.length; i += 2)
			chatMessage(parameters[i], parameters[i+1]);
	};
	
	guac.onvote = function(parameters) {
		switch (parseInt(parameters[0])) {
			case 0:
				debugLog("Vote started");
			// Fall-through
			case 1:
				// Update vote stats
				debugLog("Update vote stats");
				setVoteStats(parameters);
			break;
			case 2:
				debugLog("Voting ended");
				$("#vote-alert").hide();
				$("#vote-stats").hide();
				hasVoted = false;
			break;
			case 3:
				alert("Please wait " + parameters[1] + " seconds before starting another vote.")
				hasVoted = false;
			break;
		}
	}
	
	guac.onfile = function(parameters) {
		switch (parseInt(parameters[0])) {
		case fileResponse.BEGIN:
			/*debugLog("File upload started");
			debugLog("Upload ID: " + parameters[1]);*/
			startFileUpload(parameters[1]);
			break;
		case fileResponse.FINISHED:
			$("#upload-input").val(null).prop("disabled", false);
			displayUploadWaitTime(parameters.length === 2 ? parseInt(parameters[1]) : 0);
			break;
		case fileResponse.WAIT_TIME:
			displayUploadWaitTime(parseInt(parameters[1]));
			break;
		case fileResponse.FAILED:
			$("#upload-input").val(null).prop("disabled", false);
			displayUploadWaitTime(parameters.length === 2 ? parseInt(parameters[1]) : 0);
			alert("File upload failed");
			break;
		case fileResponse.TIMED_OUT:
			$("#upload-input").val(null).prop("disabled", false);
			displayUploadWaitTime(parameters.length === 2 ? parseInt(parameters[1]) : 0);
			alert("File upload timed out");
			break;
		case fileResponse.UPLOAD_IN_PROGRESS:
			$("#upload-btn, #upload-input").prop("disabled", true);
			break;
		}
	}
	
	guac.onaction = function(parameters) {
		updateActions(parameters);
	}

	document.addEventListener("mousedown", function() {
		if (focused)
			setFocus(false);
	});
	
	// Mouse
	mouse = new ("ontouchstart" in document ? Guacamole.Mouse.Touchscreen : Guacamole.Mouse)(guac.getDisplay().getElement());
	mouse.onmousedown = function(mouseState) {
		if (!focused)
			setFocus(true);
		if (hasTurn)
			guac.sendMouseState(mouseState);
	};
	mouse.onmouseup =
	mouse.onmousemove = function(mouseState) {
		if (hasTurn)
			guac.sendMouseState(mouseState);
	};
	// Keyboard
	keyboard = new Guacamole.Keyboard(document);
	// Connect to the server
	guac.connect();
});

// Disconnect on close
window.onunload = function() {
	guac.disconnect();
}
