#!/bin/bash
npm run lint > lint_out.txt 2>&1
cat lint_out.txt
