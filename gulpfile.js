const child_process = require('child_process');
const glob          = require('glob');
const gulp          = require('gulp');
// const babel         = require('gulp-babel');
const minifyCSS     = require('gulp-csso');
const gzip          = require('gulp-gzip');
const gulpif        = require('gulp-if');
const less          = require('gulp-less');
const replace       = require('gulp-replace');
const uglify        = require('gulp-uglify');
const merge         = require('merge-stream');
const path          = require('path');
const rollup        = require('rollup-stream');
const commonjs      = require('rollup-plugin-commonjs');
const resolve       = require('rollup-plugin-node-resolve');
const source        = require('vinyl-source-stream');

const isProd = process.env.NODE_ENV === 'production';

gulp.task('bucklescript', (cb) => {
  child_process.exec('bsb -make-world', cb);
});

gulp.task('client-rollup', [ 'bucklescript' ], () => {
  const plugins = [
    resolve(),
    commonjs(),
  ];

  return merge(glob.sync('client/*.js').map(input => {
    return rollup({ input, plugins, format: 'iife' })
      .pipe(source(path.resolve(input), path.resolve('client')));
  }))
    .pipe(gulp.dest('build'));
});

gulp.task('client', [ 'client-rollup' ], () => {
  return gulp.src('build/*.js')
    .pipe(gulpif(isProd, uglify()))
    .pipe(gulp.dest('dist'))
    .pipe(gzip())
    .pipe(gulp.dest('dist'));
});

gulp.task('config', () => {
  return gulp.src('server/nginx.conf')
    .pipe(replace('PROJECT_ROOT', __dirname + '/'))
    .pipe(gulp.dest(''));
});

gulp.task('css', () => {
  return gulp.src('client/less/*.less')
    .pipe(less())
    .pipe(gulpif(isProd, minifyCSS()))
    .pipe(gulp.dest('dist'))
    .pipe(gzip())
    .pipe(gulp.dest('dist'));
});

gulp.task('public', () => {
  return gulp.src('public/*')
    .pipe(gzip())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', [ 'client', 'config', 'css', 'public' ]);

gulp.task('watch', [ 'default' ], () => {
  gulp.watch('client/bs/**/*',    [ 'client' ]);
  gulp.watch('client/*.js',       [ 'client' ]);
  gulp.watch('client/*.less',     [ 'css'    ]);
  gulp.watch('server/nginx.conf', [ 'config' ]);
  gulp.watch('public/*',          [ 'public' ]);
});