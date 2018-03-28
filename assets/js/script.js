var lateNightSwift = (function() {
	var unit = 27; // Must match $unit scss value
	var isHeaderCollapsed = false;
	var lineHeightGuide = null;

	function setUpSiteHeaderCollapsingOnScroll() {
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

	function setupShowMeTheRhythmLink() {
		var link = $("#show-me-the-rhythm");
		link.click(function() {
			toggleLineHeightGuide();
			return false;
		});
		updateShowMeTheRhythmLinkText();
	}

	function updateShowMeTheRhythmLinkText() {
		var text = lineHeightGuide == null ? "Show Me the Rhythm" : "Enough of the Rhythm";
		$("#show-me-the-rhythm").text(text)
	}

	function toggleLineHeightGuide() {
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
		updateShowMeTheRhythmLinkText();
	}

	return {
		init: function() {
			setUpSiteHeaderCollapsingOnScroll();
			setupShowMeTheRhythmLink();
		},
		toggleLineHeightGuide: toggleLineHeightGuide
	};
}());

// Init on DOM ready
$(function() {
	lateNightSwift.init()
})
