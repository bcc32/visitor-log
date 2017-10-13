const glob      = require('glob');
const gulp      = require('gulp');
const minifyCSS = require('gulp-csso');
const gzip      = require('gulp-gzip');
const less      = require('gulp-less');
const replace   = require('gulp-replace');
const merge     = require('merge-stream');
const path      = require('path');
const rollup    = require('rollup-stream');
const babel     = require('rollup-plugin-babel');
const commonjs  = require('rollup-plugin-commonjs');
const resolve   = require('rollup-plugin-node-resolve');
const uglify    = require('rollup-plugin-uglify');
const source    = require('vinyl-source-stream');

gulp.task('client', () => {
  const plugins = [
    resolve(),
    commonjs(),
  ];
  if (process.env.NODE_ENV === 'production') {
    plugins.push(babel({
      exclude: 'node_modules/**',
    }));
    plugins.push(uglify());
  }

  return merge(glob.sync('client/*.js').map(input => {
    return rollup({ input, plugins, format: 'iife' })
      .pipe(source(path.resolve(input), path.resolve('client')));
  }))
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
    .pipe(minifyCSS())
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
  gulp.watch('client/*.js',       [ 'client' ]);
  gulp.watch('client/*.less',     [ 'css'    ]);
  gulp.watch('server/nginx.conf', [ 'config' ]);
  gulp.watch('public/*',          [ 'public' ]);
});
