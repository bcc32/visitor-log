const child_process = require('child_process');
const glob          = require('glob');
const gulp          = require('gulp');
const babel         = require('gulp-babel');
const minifyCSS     = require('gulp-csso');
const gzip          = require('gulp-gzip');
const gulpif        = require('gulp-if');
const less          = require('gulp-less');
const rename        = require('gulp-rename');
const replace       = require('gulp-replace');
const tar           = require('gulp-tar');
const uglify        = require('gulp-uglify');
const lazypipe      = require('lazypipe');
const merge         = require('merge-stream');
const path          = require('path');
const pump          = require('pump');
const rollup        = require('rollup-stream');
const commonjs      = require('rollup-plugin-commonjs');
const resolve       = require('rollup-plugin-node-resolve');
const buffer        = require('vinyl-buffer');
const source        = require('vinyl-source-stream');

const isProd = process.env.NODE_ENV === 'production';

gulp.task('bucklescript', (cb) => {
  child_process.exec('./node_modules/.bin/bsb -make-world', (err, stdout) => {
    if (err != null) {
      return cb(new Error(stdout.toString()));
    }
    cb();
  });
});

const minifyJS = lazypipe()
      .pipe(buffer)
      .pipe(babel)
      .pipe(uglify);

gulp.task('client', [ 'bucklescript' ], (cb) => {
  const clientFiles = merge(glob.sync('client/*.js').map(input => {
    return rollup({
      input,
      format: 'iife',
      plugins: [
        resolve(),
        commonjs(),
      ],
    })
      .pipe(source(path.resolve(input), path.resolve('client')));
  }));
  pump([
    clientFiles,
    gulpif(isProd, minifyJS()),
    gulp.dest('dist'),
    gzip(),
    gulp.dest('dist'),
  ], cb);
});

gulp.task('config', (cb) => {
  pump([
    gulp.src('server/nginx.conf'),
    replace('PROJECT_ROOT', __dirname + '/'),
    gulp.dest(''),
  ], cb);
});

gulp.task('css', (cb) => {
  pump([
    gulp.src('client/less/*.less'),
    less(),
    gulpif(isProd, minifyCSS()),
    gulp.dest('dist'),
    gzip(),
    gulp.dest('dist'),
  ], cb);
});

gulp.task('public', (cb) => {
  pump([
    gulp.src('public/*'),
    gzip(),
    gulp.dest('dist'),
  ], cb);
});

gulp.task('server', (cb) => {
  pump([
    gulp.src('server/*.js'),
    babel(),
    gulp.dest('bin'),
  ]);
});

gulp.task('default', [ 'client', 'config', 'css', 'public', 'server' ]);

gulp.task('dist', [ 'default' ], (cb) => {
  pump([
    // FIXME this is a hack
    gulp.src([
      '**/*',
      '!node_modules/**/*',
      '!data.db',
      '!lib/**/*',
      '!logs/**/*',
      '!dist.tar.gz',
    ]),
    rename((path) => {
      path.dirname = 'bcc32.com/' + path.dirname;
    }),
    tar('dist.tar'),
    gzip(),
    gulp.dest('.'),
  ], cb);
});

gulp.task('watch', [ 'default' ], () => {
  gulp.watch('client/bs/**/*',    [ 'client' ]);
  gulp.watch('client/*.js',       [ 'client' ]);
  gulp.watch('client/*.less',     [ 'css'    ]);
  gulp.watch('server/nginx.conf', [ 'config' ]);
  gulp.watch('public/*',          [ 'public' ]);
  gulp.watch('server/*.js',       [ 'server' ]);
});
