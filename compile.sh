#!/bin/sh
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --externs jquery_externs.js --js timetable.js > timetable.min.js
