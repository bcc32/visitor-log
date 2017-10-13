const gulp      = require('gulp');
const gzip      = require('gulp-gzip');
const less      = require('gulp-less');
const minifyCSS = require('gulp-csso');

gulp.task('css', () => {
  return gulp.src('client/*.less')
    .pipe(less())
    .pipe(minifyCSS())
    .pipe(gzip())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', [ 'css' ]);

gulp.task('watch', () => {
  gulp.watch('client/*.less', [ 'css' ]);
});
