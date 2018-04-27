# Late Night Swift Blog

## Prerequisites

Install Docker for Mac: https://www.docker.com/docker-mac

## Setup

```bash
cd [repo-path]
docker-compose build
```

## Starting and Stopping

```bash
docker-compose up
```

Browse: http://localhost:4000

```bash
docker-compose down
```

## Updating Gems

If you need to update/add Gems:

1. Shut down: `docker-compose down`
2. Edit: [Gemfile](Gemfile)
3. Re-build: `docker-compose build`
4. Re-start: `docker-compose up`

## Cross Posting to Medium

```bash
docker-compose -f scripts/medium/docker-compose.yml run --rm medium python post.py -f ../../_posts/2018-04-26-implementing-night-mode.md
```

or

```bash
docker build -t latenightswift/medium -f scripts/medium/Dockerfile .
docker run -it --rm -v (pwd):/home --env-file .env latenightswift/medium bash -c "python post.py -f ../../_posts/2018-04-26-implementing-night-mode.md"
```
