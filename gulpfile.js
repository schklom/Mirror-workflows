// Less configuration
const gulp = require('gulp');
const less = require('gulp-less');
const touch = require('gulp-touch-fd');

function swallowError(error) {
	console.log(error.toString())

	this.emit('end')
}

gulp.task('less', function(cb) {
  gulp
    .src(['themes/compact.less', 'themes/compact_night.less',
         'themes/light.less', 'themes/night_blue.less', 'themes/night.less'])
    .pipe(less())
    .on('error', swallowError)
    .pipe(
      gulp.dest(function(f) {
        return f.base;
      })
    ).pipe(touch());
  cb();
});

gulp.task(
  'default',
  gulp.series('less', function(cb) {
    gulp.watch(['themes/*.less', 'themes/*/*.less'], gulp.series('less'));
    cb();
  })
);
