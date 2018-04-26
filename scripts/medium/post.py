# -*- coding: utf-8 -*-

import os, argparse, medium, frontmatter, yaml, re

parser = argparse.ArgumentParser()
parser.add_argument(
	"-f", "--file",
	help="Path of markdown post file to upload"
)
parser.add_argument(
	"-c", "--config",
	default="../../_config.yml",
	help="Path of Jekyll _config.yml file"
)
parser.add_argument(
	"-t", "--token",
	default=os.environ.get("MEDIUM_ACCESS_TOKEN"),
	help=("Medium access token. Default is to read "
		  "MEDIUM_ACCESS_TOKEN environment variable")
)
args = parser.parse_args()

config_path = args.config
file_path = args.file
access_token = args.token

with open(config_path, "r") as stream:
    config = yaml.load(stream)

blog_url_display = "latenightswift.com"
blog_url = "https://www.latenightswift.com"

post_content_replacements = [
	("@{{ site.twitter.username }}", "[@%s](%s)" % (
		config["twitter"]["username"],
		config["twitter_url"])
	),
	("{{ site.subscribe_url }}", config["subscribe_url"]),
]
medium_post_tags = ["Swift", "iOS App Development", "Xcode"]

post = frontmatter.load(file_path)
# From file name: 2018-04-05-implementing-night-mode.md
# To url path: 2018/04/05/implementing-night-mode/
file_name = os.path.basename(file_path)
post_path = os.path.splitext(file_name)[0].replace("-", "/", 3) + "/"
post_url = "%s/%s" % (blog_url, post_path)
post_title = post.metadata["title"]

post_content_prefix = (
	"# %s\n"
	"*For optimum flavour, this post is best served at [Late Night Swift](%s).*"
	"\n\n---\n\n"
	% (post_title, post_url)
)
post_content = post_content_prefix + post.content

for find, replace in post_content_replacements:
	post_content = re.sub(find, replace, post_content)

# Search for liquid tags and bail if exist
if "{{" in post_content or "{%" in post_content:
	print "ERROR: One or more liquid tags exist in post content"
	exit()

print "Uploading draft \"%s\"" % post_title
print "Canonical URL: %s" % post_url

client = medium.Client(access_token=access_token)
user = client.get_current_user()
user_id = user["id"]
post = client.create_post(
	user_id=user_id,
	title=post_title,
	content=post_content,
	content_format="markdown",
	tags=medium_post_tags,
	canonical_url=post_url,
	publish_status="draft",
)

print "Post successful:\n%s" % post
