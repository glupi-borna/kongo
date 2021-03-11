#!/bin/bash

function __parallel_trap() {
	trap - SIGINT
	echo "Killing..."
	[[ -z "$(jobs -p)" ]] || kill $(jobs -p)
}

function parallel() {
	trap __parallel_trap SIGINT
	for arg in "$@"; do
		bash -c "$arg" &
	done
	wait
	trap - SIGINT
}

if [ ! -x "$(command -v sass)" ]; then
	echo "Sass is not installed!"
	return 1
fi

cd src
parallel "../util/localserver" "sass --watch style.scss:style.css"
