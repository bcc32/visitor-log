const Promise       = require('bluebird');
const child_process = require('child_process');
const fs            = require('fs');
const glob          = require('glob');
const gulp          = require('gulp');
const babel         = require('gulp-babel');
const changed       = require('gulp-changed');
const minifyCSS     = require('gulp-csso');
const gzip          = require('gulp-gzip');
const gulpif        = require('gulp-if');
const less          = require('gulp-less');
const replace       = require('gulp-replace');
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

Promise.promisifyAll(child_process);
Promise.promisifyAll(fs);

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
    changed('dist'),
    // FIXME this doesn't account for changing NODE_ENV
    gulpif(isProd, minifyJS()),
    gulp.dest('dist'),
    gzip(),
    gulp.dest('dist'),
  ], cb);
});

gulp.task('config', (cb) => {
  pump([
    gulp.src('server/nginx.conf'),
    changed('.'),
    replace('PROJECT_ROOT', __dirname + '/'),
    gulp.dest('.'),
  ], cb);
});

gulp.task('css', (cb) => {
  pump([
    gulp.src('client/less/*.less'),
    changed('dist', { extension: '.css' }),
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
    changed('dist', { transformPath: p => p + '.gz' }),
    gzip(),
    gulp.dest('dist'),
  ], cb);
});

gulp.task('server', (cb) => {
  pump([
    gulp.src('server/*.js'),
    changed('bin'),
    babel(),
    gulp.dest('bin'),
  ], cb);
});

gulp.task('default', [ 'client', 'config', 'css', 'public', 'server' ]);

gulp.task('dist', [ 'default' ], (cb) => {
  const version = require('./package.json').version;
  const filename = 'bcc32.com-v' + version + '.tar.gz';
  const basename = path.basename(__dirname) + '-v' + version;
  fs.symlinkAsync('.', basename)
    .then(() => child_process.execAsync('git ls-files -z'))
    .then(stdout => {
      const files = stdout.split('\0').filter(x => x !== '');
      files.push('bin');
      files.push('dist');
      return files;
    })
    .then(files => {
      return ['-czf', filename].concat(files.map(x => path.join(basename, x)));
    })
    .then(args => child_process.execFileAsync('tar', args))
    .finally(() => fs.unlinkAsync(basename))
    .asCallback(cb);
});

gulp.task('watch', [ 'default' ], () => {
  gulp.watch('client/bs/**/*',    [ 'client' ]);
  gulp.watch('client/*.js',       [ 'client' ]);
  gulp.watch('client/*.less',     [ 'css'    ]);
  gulp.watch('server/nginx.conf', [ 'config' ]);
  gulp.watch('public/*',          [ 'public' ]);
  gulp.watch('server/*.js',       [ 'server' ]);
});
