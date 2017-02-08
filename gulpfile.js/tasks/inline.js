var gulp = require('gulp');
var inlinesource = require('gulp-inline-source');


gulp.task( 'inline', function inlineTask() {
    gulp.src(['./client/bv-bubble/bv-bubble.html','./client/bv-burnup/bv-burnup.html','./client/enhanced-burnup/enhanced-burnup.html' ])
        .pipe(inlinesource({
            rootpath: './node_modules',
            compress: false,
            pretty: false
        }))
        .pipe(gulp.dest('./dist'));
});

