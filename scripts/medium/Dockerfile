FROM ubuntu:16.04

ENV LC_ALL C.UTF-8
ENV LANG en_GB.UTF-8
ENV LANGUAGE en_GB.UTF-8

RUN apt-get -y update
RUN apt-get -y install build-essential tree
RUN apt-get -y install python2.7-dev python-pip

RUN pip install --upgrade pip

COPY ../../ /home
WORKDIR /home/scripts/medium

RUN pip install -r requirements.txt
