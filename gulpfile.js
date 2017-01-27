var gulp = require('gulp');
var inlinesource = require('gulp-inline-source');

gulp.task('inline', () => gulp.src('./client/index.html')
                                .pipe(inlinesource({
                                    rootpath: './node_modules',
                                    compress: true,
                                    pretty: true
                                }))
                                .pipe(gulp.dest('./dist')));
