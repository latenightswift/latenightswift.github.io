FROM ubuntu:16.04

ENV LC_ALL C.UTF-8
ENV LANG en_GB.UTF-8
ENV LANGUAGE en_GB.UTF-8

RUN apt-get -y update
RUN apt-get -y install ruby ruby-dev build-essential tree
RUN apt-get -y install patch zlib1g-dev liblzma-dev # For Nokogiri

RUN gem install bundler

WORKDIR /srv
COPY . /srv

RUN bundle install
