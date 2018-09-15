const gulp         = require('gulp'),
      gulpLoadPlugins = require('gulp-load-plugins')
      uglify       = require('gulp-uglify-es').default,
      sass         = require('gulp-sass'),
      autoprefixer = require('gulp-autoprefixer'),
      uglifycss    = require('gulp-uglifycss'),
      plumber      = require('gulp-plumber'),
      babel        = require('gulp-babel'),
      concat       = require('gulp-concat'),
      browserSync  = require('browser-sync').create(),
      htmlmin      = require('gulp-htmlmin'),
      clean        = require('gulp-clean'),
      replace      = require('gulp-string-replace'),
      responsive   = require('gulp-responsive'),
      sourcemaps   = require('gulp-sourcemaps'),
      browserify   = require('browserify'),
      babelify     = require('babelify'),
      source       = require('vinyl-source-stream'),
      buffer       = require('vinyl-buffer'),
      runSequence  = require('run-sequence'),
      rev          = require('gulp-rev'),
      fs           = require('fs'),
      file         = require('gulp-file');
      
const reload = browserSync.reload,
    $ = gulpLoadPlugins();

let dev = true;

/////////////////////////////// Watch Mode : .temp ///////////////////////////////

gulp.task('watch', ['scripts', 'styles', 'html', 'moveSW'], function () {

    browserSync.init({
        server: "./.temp"
    });

    gulp.watch("src/sass/*.scss", ['styles']);
    gulp.watch("src/js/*.js", ['scripts']);
    gulp.watch("src/js/service-worker.js", ['moveSW']);
    gulp.watch("src/*.html", ['html']).on('change', reload);
});

// styles .scss
gulp.task('styles', function () {
    return gulp.src("src/sass/*.scss")
        .pipe($.if(dev, $.sourcemaps.init()))
        .pipe(sass({
            includePaths: require('node-normalize-scss').includePaths
        }))
        .pipe(plumber())
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('style.css'))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: true
        }))
        .pipe($.if(dev, $.sourcemaps.write(), uglifycss()))
        // .pipe($.if(!dev, rev()))
        .pipe($.if(dev, gulp.dest('.temp/css'), gulp.dest('dist/css')))
        .pipe(reload({
            stream: true
        }));
});

// ESLint
gulp.task('lint', function () {
    return gulp.src('src/js/**/*.js')
        .pipe($.eslint({
            fix: true
        }))
        .pipe(reload({
            stream: true,
            once: true
        }))
        .pipe($.eslint.format())
        .pipe($.if(!browserSync.active, $.eslint.failAfterError()))
        // .pipe(gulp.dest('src/js/'));
});

// scripts .js
gulp.task('scripts', ['lint'], function () {
    let files = ['main', 'restaurant_info']
    return files.map((file) => {
        gulp.src([
                'src/js/dbhelper.js',
                `src/js/${file}.js`,
                'src/js/sw-registration.js'
            ])
            .pipe($.if(dev, sourcemaps.init()))
            .pipe(plumber())
            .pipe(concat(`${file}.js`))
            .pipe(babel({
                presets: ['env']
            }))
            .pipe($.if(dev, sourcemaps.write()))
            .pipe($.if(!dev, uglify()))
            .pipe($.if(dev, gulp.dest('.temp/js'), gulp.dest('dist/js')))
            .pipe(reload({
                stream: true
            }))
    })

});

// Move Service Worker to .temp
gulp.task('moveSW', ['lint'], function () {

    const bundler = browserify('src/js/service-worker.js', {debug: true}); // ['1.js', '2.js']

    return bundler
        .transform(babelify, {
            presets: ["babel-preset-env"],
            sourceMaps: dev ? true : false
        }) // required for 'import'
        .bundle()
        .pipe(source('service-worker.js')) // get text stream w/ destination filename
        .pipe(buffer()) // required to use stream w/ other plugins
        .pipe($.if(!dev, uglify()))
        .pipe($.if(dev, gulp.dest('.temp/'), gulp.dest('dist/')))
})

// Copy html files
gulp.task('html', function () {
    return gulp.src('src/*.html')
        .pipe($.if(!dev, htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: {
                compress: {
                    drop_console: true
                }
            },
            processConditionalComments: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        })))
        .pipe($.if(dev, gulp.dest('.temp/'), gulp.dest('dist/')))
})

// Generates responsive images
gulp.task('res-images', function () {
    return gulp.src('src/imgs/*.{png,jpg}')
        .pipe(responsive({
            '*.jpg': [{
                width: 300,
                rename: {
                    suffix: '-300'
                },
            }, {
                width: 400,
                rename: {
                    suffix: '-400'
                },
            }, {
                width: 600,
                rename: {
                    suffix: '-600_2x'
                },
            }, {
                width: 800,
                rename: {
                    suffix: '-800_2x'
                },
            }, {
                rename: {
                    suffix: ''
                }
            }],
        }, {
            // Global configuration for all images
            // The output quality for JPEG, WebP and TIFF output formats
            quality: 60,
            // Use progressive (interlace) scan for JPEG and PNG output
            progressive: true,
            // Strip all metadata
            withMetadata: false,
        }))
        .pipe($.if(dev, gulp.dest('.temp/img'), gulp.dest('dist/img')))
});

// Copy PWA files
gulp.task('pwafiles', function () {
    return gulp.src(['src/manifest.json', 'src/pwaicons/**/*.*'], {
        base: './src'
    })
    .pipe($.if(dev, gulp.dest('.temp/'), gulp.dest('dist/')))
});

// Clean temp directory
gulp.task('clean', function () {
    return gulp.src(dev ? '.temp' : 'dist', {
        read: false
    }).pipe(clean())
    // .pipe($.if(!dev, file('rev-manifest.json', '')))
    // .pipe($.if(!dev, gulp.dest('dist/')))
});

gulp.task('serve', () => {
    runSequence(['clean'], ['watch', 'res-images', 'pwafiles'])
})

/////////////////////////////// Build for Prod : Dist ///////////////////////////////

gulp.task('build', ['scripts', 'styles', 'html', 'moveSW', 'res-images', 'pwafiles'], () => {
    return gulp.src('dist/**/*').pipe($.size({
        title: 'build',
        gzip: true
    }));
});

gulp.task('bundles', function () {
    return gulp.src(['dist/js/*.js', 'dist/css/*.css'], {
            base: 'dist'
        })
        .pipe(rev())
        .pipe(gulp.dest('dist/'))
        .pipe(rev.manifest({
            merge: true
        }))
        .pipe(gulp.dest('dist/'))
});

gulp.task('fixbundles', ['bundles'], function () {

    const revs = JSON.parse(fs.readFileSync('dist/rev-manifest.json'));
    let src = gulp.src(['dist/service-worker.js', 'dist/*.html'])
    for (const rev in revs) {
        src.pipe(replace(rev, revs[rev]))
    }
    src.pipe(gulp.dest('dist/'))

    for (const rev in revs) {
        fs.unlink(`dist/${rev}`)
    }
    
});

gulp.task('default', () => {
    return new Promise(resolve => {
        dev = false;
        runSequence('clean', 'build', 'fixbundles', resolve);
    });
});