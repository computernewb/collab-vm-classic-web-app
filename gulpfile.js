var gulp = require('gulp'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	inject = require('gulp-inject'),
	htmlmin = require('gulp-htmlmin'),
	uglify = require('gulp-uglify'),
	fs = require('fs');

gulp.task('default', ['html']);

gulp.task('html', ['js', 'res'], function() {
	return gulp.src('src/html/*.html')
		.pipe(inject(gulp.src(['build/all.min.js', 'build/*.css'], {read: false}),
			{ ignorePath: 'build', addPrefix: 'collab-vm' }))
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
});

gulp.task('js', function() {
	return gulp.src(['src/js/collab-vm/jquery.history.js', 'src/js/guacamole/**/*.js', 'src/js/collab-vm/common.js', 'src/js/collab-vm/en-us-qwerty.js', 'src/js/collab-vm/collab-vm.js'])
		.pipe(concat('all.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('build'));
});

gulp.task('res', function() {
	return gulp.src('src/res/**/*',  { dot: true /* Include .htaccess files */ })
		.pipe(gulp.dest('build'));
});

gulp.task('guacamole', function() {
	return gulp.src('src/js/guacamole/*.js')
		.pipe(concat('guacamole.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('src/html'));
});

