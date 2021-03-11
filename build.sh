#!/bin/bash
jar_exec="jar"

if [ -x "$(command -v fastjar)" ]; then
	jar_exec="fastjar"
fi

cd src ; $jar_exec -cvf ../frontend.war * ; cd ..
