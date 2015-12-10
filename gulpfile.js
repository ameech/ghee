var gulp         = require('gulp'),
    watchify     = require('watchify'),
    browserify   = require('browserify'),
    babelify     = require("babelify"),
    sourcemaps   = require("gulp-sourcemaps"),
    source       = require('vinyl-source-stream'),
    buffer       = require('vinyl-buffer'),
    gutil        = require('gulp-util'),
    es           = require('event-stream'),
    concat       = require("gulp-concat"),
    sass         = require("gulp-sass"),
    autoprefixer = require('gulp-autoprefixer');

// Configuration
var sourcePath = './src/';

var entryFiles = [
    'app.js'
];

var configFiles = [
    './icon.png',
    './manifest.json'
];

var output = {
    'js': './dist/assets/js',
    'css': './dist/assets/css'
};

var vendorFiles = [];

// add custom browserify options here

var bundles = [];

var ES6 = {
    bundle: function(file) {
        var opts = {
            entries: [sourcePath + file],
            paths: ['./node_modules', sourcePath],
            cache: {},
            packageCache: {}
        };
        var b = browserify(opts);
        b.file = file;

        b.transform(babelify);

        return b;
    },
    build: function(bundle) {
        return bundle.bundle()
            // log errors if they happen
            .on('error', gutil.log.bind(gutil, 'Browserify Error'))
            .pipe(source(bundle.file))
            // optional, remove if you don't need to buffer file contents
            .pipe(buffer())
            // optional, remove if you dont want sourcemaps
            .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
               // Add transformation tasks to the pipeline here.
            .pipe(sourcemaps.write('./')) // writes .map file
            .pipe(gulp.dest(output.js));
    },
    watch: function(bundle) {
        var w = watchify(bundle, {debug: true});
        w.on('log', gutil.log);
        w.on('time', function(time) {
            gutil.log(gutil.colors.green('Browserify'), bundle.file, gutil.colors.blue('in ' + time + ' ms'));
        });
        w.on('update', ES6.build.bind(null, bundle));
        return w;
    }
}

gulp.task("bundle", function() {
    // map them to our stream function
    var bundles = entryFiles.map(function(file) {
        return ES6.build(ES6.bundle(file));
    });
    // create a merged stream
    return es.merge.apply(null, bundles);
});

gulp.task("vendor", function() {
    return gulp.src(vendorFiles)
        .pipe(sourcemaps.init())
        .pipe(concat('vendor.js'))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(output.js));
});

gulp.task('sass', function () {
    return gulp.src('./src/styles/[^_]*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions', 'ie >= 9'], // More info at https://github.com/ai/browserslist
            cascade: false
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(output.css));
});

gulp.task("config", function() {
    return gulp.src(configFiles)
        .pipe(gulp.dest('./dist'));
});

gulp.task("build", ["vendor", "bundle", "sass", "config"]);

gulp.task("watch", ["vendor", "sass", "config"], function () {

    gulp.watch("./src/styles/**/*.scss", ["sass"]);
    gulp.watch(configFiles, ["config"]);

    var streams = entryFiles.map(function(file) {
        return ES6.build(ES6.watch(ES6.bundle(file)));
    });

    // create a merged stream
    return es.merge.apply(null, streams);
});

gulp.task("default", ["watch"]);
