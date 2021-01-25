const gulp = require('gulp'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	inject = require('gulp-inject'),
	htmlmin = require('gulp-htmlmin'),
	terser = require('gulp-terser'),
	rollup = require('gulp-rollup'),
	gap = require('gulp-append-prepend')
	sourcemaps = require('gulp-sourcemaps')
	fs = require('fs');

// Paths
const paths = {
	html: "src/html/*.html",

	// Guacamole code.
	// This is bundleified using a abomination
	guacamole: [
		'src/js/guacamole/Display.js',
		'src/js/guacamole/Parser.js',
		'src/js/guacamole/Client.js',
		'src/js/guacamole/OnScreenKeyboard.js',
		'src/js/guacamole/ArrayBufferReader.js',
		'src/js/guacamole/OutputStream.js',
		'src/js/guacamole/BlobReader.js',
		'src/js/guacamole/StringReader.js',
		'src/js/guacamole/Mouse.js',
		'src/js/guacamole/Tunnel.js',
		'src/js/guacamole/AudioChannel.js',
		'src/js/guacamole/InputStream.js',
		'src/js/guacamole/IntegerPool.js',
		'src/js/guacamole/Keyboard.js',
		'src/js/guacamole/Status.js',
		'src/js/guacamole/ArrayBufferWriter.js',
		'src/js/guacamole/Layer.js',
		'src/js/guacamole/StringWriter.js',
		'src/js/guacamole/Version.js'
	],

	// It's important to note that these file paths are
	// in a virtual filesystem to rollup. Add any files here which
	// rollup needs to see.
	client: [
		'tmp/guacamole.module.js',
		'src/js/collab-vm/common.js', 
		'src/js/collab-vm/en-us-qwerty.js',
		'src/js/collab-vm/collab-vm.js',

		'src/js/collab-vm/jquery.history.js',
	],

	client_entry: 'src/js/collab-vm/collab-vm.js'
};

function HtmlTask() {
	return gulp.src([paths.html])
		.pipe(inject(gulp.src(['build/all.min.js', 'build/*.css'], { read: false }), { ignorePath: 'build', addRootSlash: false }))
		.pipe(inject(gulp.src('src/templates/*.html').pipe(rename((path) => {
			// This is a trick to use gulp-inject as a simple html template engine
			// It switches the filename and extension so multiple templates can be used
			path.extname = '.' + path.basename;
			path.basename = 'html';
		})), {
			transform: function (filePath, file) {
				return file.contents.toString('utf8');
			}
		}))
		.pipe(htmlmin(JSON.parse(fs.readFileSync('html-minifier.conf', 'utf8'))))
		.pipe(gulp.dest('build', { overwrite: true }));
}

function CompressBundle() {
	return gulp.src('tmp/all.js')
		.pipe(sourcemaps.init())
			.pipe(terser({
				output: {
					comments: false
				},
				mangle: {
					eval: true,
					module: true,
					toplevel: true
				}
			}))
			.pipe(concat('all.min.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('build'));
}

function BuildBundle() {
	return gulp.src(paths.client)
		.pipe(sourcemaps.init())
			.pipe(rollup({
				input: paths.client_entry, 
				output: {
					format: "iife",
					name: "e" // unused but we need it for IIFE/closure
				}
			}))
			.pipe(concat('all.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('tmp'));
}

function ResTask() {
	return gulp.src('src/res/**/*')
		.pipe(gulp.dest('build'));
}


// This task throws all of the Guacamole code together into a temporary file
// which we later use to build the module.
function ConcatGuacModule() {
	return gulp.src(paths.guacamole)
		.pipe(concat('guacamole.module.tmp.js'))
		.pipe(gulp.dest('tmp')); // todo...
}

// This task then takes the temporary file from the ConcatGuacModule step, 
// and wraps it with the code needed to turn it into a legitimate ES6 module. 
// After we do this, we now have code that can be integrated into some module space.
function BuildGuacModule() {
	return gulp.src('tmp/guacamole.module.tmp.js')
		.pipe(gap.prependText('export function GetGuacamole() {'))
		.pipe(gap.appendText('return Guacamole; }'))
		.pipe(concat('guacamole.module.js'))
		.pipe(gulp.dest('tmp')); // todo...
}



// default task
exports.default = gulp.series(
	ConcatGuacModule, // These two need to be done first before the client bundle.	
	BuildGuacModule,
	
	BuildBundle,
	CompressBundle, // makes prod bundle
	ResTask,
	HtmlTask
);
