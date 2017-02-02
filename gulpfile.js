var gulp = require('gulp');
var inlinesource = require('gulp-inline-source');


gulp.task('inline', () => gulp.src('./client/burnup.html')
                                .pipe(inlinesource({
                                    rootpath: './node_modules',
                                    compress: false,
                                    pretty: false
                                }))
                                .pipe(gulp.dest('./dist')));
                                


