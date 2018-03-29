var lateNightSwift = (function() {
	var hostnamePattern = "(www\.)?latenightswift\.com";
	var unit = 27; // Must match $unit scss value
	var isHeaderCollapsed = false;
	var lineHeightGuide = null;

	function init() {
		_setUpSiteHeaderCollapsingOnScroll();
		_setupExternalLinksToOpenInNewTab();
		_setupShowMeTheRhythmLink();
	}

	function _setUpSiteHeaderCollapsingOnScroll() {
		$(window).scroll(function() {
			var scrollPosition = $(this).scrollTop();
			var triggerPosition = unit;
			var shouldHeaderBeCollapsed = scrollPosition > triggerPosition;

			if (shouldHeaderBeCollapsed === isHeaderCollapsed) {
				return
			}

			var siteHeader = $(".site-header");
			siteHeader.toggleClass("collapsed", shouldHeaderBeCollapsed);
			isHeaderCollapsed = shouldHeaderBeCollapsed;
		})
	}

	function _setupExternalLinksToOpenInNewTab() {
		$("a")
			.filter(function() {
				var href = $(this).attr("href");
				var externalURLPattern = "http(s)?://(?!" + hostnamePattern + ").*";
				return href.match(externalURLPattern) !== null;
			})
			.each(function() {
				$(this).attr("target", "_blank");
			});
	}

	function _setupShowMeTheRhythmLink() {
		var link = $("#show-me-the-rhythm");
		link.click(function() {
			_toggleLineHeightGuide();
			return false;
		});
		_updateShowMeTheRhythmLinkText();
	}

	function _updateShowMeTheRhythmLinkText() {
		var text = lineHeightGuide == null ? "Show Me the Rhythm" : "Enough of the Rhythm";
		$("#show-me-the-rhythm").text(text)
	}

	function _toggleLineHeightGuide() {
		if (lineHeightGuide) {
			lineHeightGuide.remove();
			lineHeightGuide = null;
		} else {
			var lineHeight = unit + "px";
			var lineColor = "rgba(255, 255, 255, 0.1)";
			lineHeightGuide = $("<div/>", {
				css: {
					position: "absolute",
					left: "0",
					top: "-1px",
					width: "100%",
					height: $(document).height() + "px",
					pointerEvents: "none",
					userSelect: "none",
					background: (
						"linear-gradient(" + lineColor +
						" 1px, transparent 1px) left top / " +
						lineHeight + " " + lineHeight
					)
				}
			});
			lineHeightGuide.appendTo("body");
		}
		_updateShowMeTheRhythmLinkText();
	}

	return {
		init: init
	};
}());

// Init on DOM ready
$(function() {
	lateNightSwift.init()
})
