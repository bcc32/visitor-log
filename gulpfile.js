const gulp      = require('gulp');
const gzip      = require('gulp-gzip');
const less      = require('gulp-less');
const minifyCSS = require('gulp-csso');
const replace   = require('gulp-replace');

gulp.task('css', () => {
  return gulp.src('client/*.less')
    .pipe(less())
    .pipe(minifyCSS())
    .pipe(gzip())
    .pipe(gulp.dest('dist'));
});

gulp.task('nginx-config', () => {
  return gulp.src('server/nginx.conf')
    .pipe(replace('PROJECT_ROOT', __dirname + '/'))
    .pipe(gulp.dest(''));
});

gulp.task('config', [ 'nginx-config' ]);

gulp.task('default', [ 'config', 'css' ]);

gulp.task('watch', [ 'default' ], () => {
  gulp.watch('client/*.less', [ 'css' ]);
  gulp.watch('server/nginx.conf', [ 'nginx-config' ]);
});
