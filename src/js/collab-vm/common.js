// CollabVM webapp configuration

const root="/collab-vm/";

export default {
	DEBUG: false,
	DEBUG_NO_TIMEOUT: false,
	DEBUG_NO_NSFW: false,
	DEBUG_NO_CONNECT: false, // is this used?
	DEBUG_VM_LIST: false,
	DEBUG_VM_LIST: false,

	debugLog: function() {
		if(this.DEBUG)
			console.log.apply(null, arguments);
	},

	/** @const
	 * The root directory of the collab-vm project with a
	 * forward slash appended to it.
	 * This is determined at runtime to allow the project to be
	 * relocated without needing to recompile the javascript.
	 * @type {string}
	 */
	rootDir: root,
	chatSound: root + "notify",

	/**
	 * The main node this webapp is configured to connect to.
	 * @const
	 */
	serverAddress: window.location.host,

	/**
	 * Additional nodes to connect to.
	 * Uses multicollab() to do so
	 * @const
	 */
	additionalNodes: [
	]
};
