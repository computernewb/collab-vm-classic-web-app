const gulp = require('gulp'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	inject = require('gulp-inject'),
	htmlmin = require('gulp-htmlmin'),
	terser = require('gulp-terser'),
	sourcemaps = require('gulp-sourcemaps')
	fs = require('fs');

// paths for stuff
const paths = {
	html: "src/html/*.html",
	js: [
		'src/js/collab-vm/jquery.history.js', 
		'src/js/guacamole/**/*.js', 
		'src/js/collab-vm/common.js', 
		'src/js/collab-vm/en-us-qwerty.js', 
		'src/js/collab-vm/collab-vm.js'
	]
};

function HtmlTask() {
	return gulp.src([paths.html])
		.pipe(inject(gulp.src(['build/all.min.js', 'build/*.css'], {read: false}), { ignorePath: 'build', addPrefix: 'collab-vm' }))
		.pipe(inject(gulp.src('src/templates/*.html').pipe(rename(function(path) {
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
		.pipe(gulp.dest('build'));
}

function JsTask() {
	return gulp.src(paths.js)
		.pipe(sourcemaps.init())
			// fun stuff
			.pipe(terser())
			.pipe(concat('all.min.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('build'));
}

function ResTask() {
	return gulp.src('src/res/**/*',  { dot: true /* Include .htaccess files */ })
		.pipe(gulp.dest('build'));
}

function WatchTask() {
	
	
}

// default task
exports.default = gulp.series(
	JsTask,
	ResTask,
	HtmlTask
	// TODO: watch task
);
