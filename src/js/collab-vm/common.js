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

/** @define {boolean} */
var DEBUG_LOG = false;

function debugLog(msg) {
	if (DEBUG_LOG)
		console.log(msg);
}

/** @const
 * The root directory of the collab-vm project with a
 * forward slash appended to it.
 * This is determined at runtime to allow the project to be
 * relocated without needing to recompile the javascript.
 * @type {string}
 */
var rootDir = "/collab-vm/";

/** @const
 * The name of the chat sound.
 */
var chatSound = rootDir + "notify";

/**
 * The main node this webapp is configured to connect to.
 * @const 
 */
var serverAddress = window.location.host;

/** 
 * Additional nodes to connect to.
 * Uses multicollab() to do so
 * @const
 */
var additionalNodes = [
];
