---
layout: post
title: Implementing Night Mode
number: 1
description: "Post #1 of Late Night Swift! We're kicking things off by looking into building Night Mode, an ever important feature as more and more people use their devices at night."

sitemap: false
date: 2018-04-02
---

Welcome to post #1 of Late Night Swift! How better to kick things off than to look at building Night Mode, an ever important feature as more and more people use their devices at night.

<video width="304" height="540" autoplay loop>
	<source src="https://github.com/latenightswift/night-mode/raw/master/Preview.mov" type="video/mp4" />
</video>

Our goal is to make it super simple to theme your UI components and provide a smooth transition between them. To achieve this we'll build a protocol called `Themed`, which anything can conform to to get involved in theming.

```swift
extension MyView: Themed {
	func applyTheme(_ theme: AppTheme) {
		backgroundColor = theme.backgroundColor
		titleLabel.textColor = theme.textColor
		subtitleLabel.textColor = theme.textColor
	}
}

extension AppTabBarController: Themed {
	func applyTheme(_ theme: AppTheme) {
		tabBar.barTintColor = theme.barBackgroundColor
		tabBar.tintColor = theme.barForegroundColor
	}
}
```

> Here's the link to the sample code if you'd rather just dive-in!<br />
> <a href="https://github.com/latenightswift/night-mode">github.com/latenightswift/night-mode</a>

This exercise is more generally an implementation of theming, and if we build things right there's no reason why an app that supports night mode couldn't support other themes.

Thinking a little about the behaviour leads us to outline some initial requirements:

- Somewhere central to store the current theme, which will be a dumb struct consisting mainly of colours.
- A mechanism to notify interested parts of our app when a theme changes.
- The ability for anything to partake in theming in a clean Swifty way.
- Change the app's status bar, navigation bar and tab bar alongside custom views and view controllers.
- To perform the theme changes with a nice cross-dissolve animation.

With those thoughts in mind, let's jump in and model the main actors.

## Definition of Theming Protocols

As is always advised, writing things in a way that minimises dependencies on particular implementations leads you to create more isolated, testable and reusable code.

If we can use protocols to define what a theme is, how to get the current one and how to respond to changes, we'll be on a roll!

```swift
/// Describes a type that holds a current `Theme` and allows
/// an object to be notified when the theme is changed.
protocol ThemeProvider {
	associatedtype Theme

	/// The current theme that is active
	var currentTheme: Theme { get }

	/// Subscribe to be notified when the theme changes. Handler will be
	/// remove from subscription when `object` is deallocated.
	func subscribeToChanges(_ object: AnyObject, handler: @escaping (Theme) -> Void)
}
```

`ThemeProvider` defines something we can grab the current theme from at a single point in time, and also subscribe to theme changes over time. The subscription mechanism will work by holding on to a weak reference of `object`, and when the object is deallocated it will be removed from the list of subscriptions.

Note that we've made `Theme` an associated type. We don't want to define a particular type here as we want specific implementations to be able to represent themes however they wish.

Now we've defined somewhere that manages the current theme, let's look at how something might consume it. An object that wants to be "themed" will need to know about the current theme at the time the object is instantiated, and to also be notified if the theme changes during the object's lifetime.

```swift
/// Describes a type that can have a theme applied to it
protocol Themed {
	/// A Themed type needs to know about what concrete type the
	/// ThemeProvider is. So we don't clash with the protocol,
	/// let's call this associated type _ThemeProvider
	associatedtype _ThemeProvider: ThemeProvider

	/// Return the current app-wide theme provider
	var themeProvider: _ThemeProvider { get }

	/// This will be called whenever the current theme changes
	func applyTheme(_ theme: _ThemeProvider.Theme)
}

extension Themed where Self: AnyObject {
	/// This is to be called once when Self wants to start listening for
	/// theme changes. This immediately triggers `applyTheme()` with the
	/// current theme.
	func setUpTheming() {
		applyTheme(themeProvider.currentTheme)
		themeProvider.subscribeToChanges(self) { [weak self] newTheme in
			self?.applyTheme(newTheme)
		}
	}
}
```

Using a handy protocol extension when the conforming type is `AnyObject`, we've managed to remove the need for each conformance to do the "apply initial changes + subscribe + re-apply future changes" dance. This is all packaged up in the `setUpTheming()` method that each object can call.

When we know the concrete type of the app's theme provider we'll also be able to provide an extension on `Themed` to return the `themeProvider`, which we'll do in a minute or two.

All of this means the conforming object only needs call `setUpTheming()` once, and provide an implementation of `applyTheme()` to do it's own thing to configure itself with the theme.

## App Implementation

Now we've defined the theming API we can do the fun stuff and start applying it to our app! Let's define our concrete theme type and declare our light and dark themes.

```swift
struct AppTheme {
	var statusBarStyle: UIStatusBarStyle
	var barBackgroundColor: UIColor
	var barForegroundColor: UIColor
	var backgroundColor: UIColor
	var textColor: UIColor
}

extension AppTheme {
	static let light = AppTheme(
		statusBarStyle: .`default`,
		barBackgroundColor: .white,
		barForegroundColor: .black,
		backgroundColor: UIColor(white: 0.9, alpha: 1),
		textColor: .darkText
	)

	static let dark = AppTheme(
		statusBarStyle: .lightContent,
		barBackgroundColor: UIColor(white: 0, alpha: 1),
		barForegroundColor: .white,
		backgroundColor: UIColor(white: 0.2, alpha: 1),
		textColor: .lightText
	)
}
```

Here we've defined our `AppTheme` type to be a dumb struct that holds labelled colours and values we can use to style our app. We then declare some static properties for each available theme — in our case, a `light` and `dark` theme.

Now it's time to build our theme provider.

```swift
final class AppThemeProvider: ThemeProvider {
	static let shared: AppThemeProvider = .init()
	private var theme: SubscribableValue<AppTheme>

	var currentTheme: AppTheme {
		get {
			return theme.value
		}
		set {
			theme.value = newTheme
		}
	}

	private init() {
		theme = SubscribableValue<AppTheme>(value: .light)
	}

	func subscribeToChanges(_ object: AnyObject, handler: @escaping (AppTheme) -> Void) {
		theme.subscribe(object, using: handler)
	}
}
```

You're probably wondering what on earth this generic `SubscribableValue` is! The theme provider requires objects to subscribe to current theme changes. This logic is fairly simple and could easily be built into the theme provider, however, the behaviour of subscribing to a value is something that can, and should, be abstracted away into something more generic.

A separate, generic implementation of "a value that can be subscribed to" means it can be tested in isolation and re-used. It also cleans up the theme provider allowing it do manage only it's _specific responsibility_.

Of course, if you're using something like Rx or equivalent in your project then you can use something similar instead, such as `Variable`/`BehaviorSubject`.

> See implementation: <a href="https://github.com/latenightswift/night-mode/blob/master/Night%20Mode/Helpers/SubscribableValue.swift">SubscribableValue&lt;T&gt;</a>

There's one more thing we need to do before this is all ready to use, and that's to add an extension to `Themed` to provide a default implementation of `themeProvider` now that we have our concrete provider defined.

```swift
extension Themed where Self: AnyObject {
	var themeProvider: AppThemeProvider {
		return AppThemeProvider.shared
	}
}
```

Now everything that's themed has easy access to the app's theme provider. If you remember from the `Themed` protocol and extension, we need this property to help drive `setUpTheming()` and to get all the associated types working nicely.

### Wait, a singleton?

We've created a shared app-wide singleton instance of our theme provider, which is usually a [big red flag](https://www.swiftbysundell.com/posts/avoiding-singletons-in-swift).

Given that our theme provider is nicely unit testable, and that theming is a presentation layer body of work, this is an acceptable trade-off.

In the real world, the app's UI is built up from a huge hierarchy of nested views; native UIKit components and `UIView` subclasses, all managed by view controllers. Using dependency injection for a view model or view controller is easy, but to inject dependencies into every view on-screen would be significant work and a lot more lines of code to manage.

Generally speaking, your business logic should be unit tested, and you shouldn't find the need to be testing down to the presentation layer. This is actually a very interesting topic and something we'll be talking about in a future post.

## Getting Themed

Now we have everything we need to get our views, view controllers and app bars to respond nicely to theme changes, so let's get conforming!

### UIView

Say you have a nice `UIView` subclass and want it to respond to theme changes. All you have to do is conform to `Themed`, call `setUpTheming()` in `init` and make sure all theme related setup goes within `applyTheme()`. Don't forget `applyTheme()` gets called once at set up time too, so all your theming code can stay in one place. Job done!

```swift
class MyView: UIView {
	var label = UILabel()

	init() {
		super.init(frame: .zero)
		setUpTheming()
	}
}

extension MyView: Themed {
	func applyTheme(_ theme: AppTheme) {
		backgroundColor = theme.backgroundColor
		label.textColor = theme.textColor
	}
}
```

### UIStatusBar and UINavigationBar

It's will likely be required to also adjust the app's status and navigation bars depending on the current theme. Assuming your app is using [view controller based status bar appearance](https://developer.apple.com/library/content/documentation/General/Reference/InfoPlistKeyReference/Articles/iPhoneOSKeys.html#//apple_ref/doc/uid/TP40009252-SW29) (which is now the default), you can subclass your navigation controller and conform to themed:


```swift
class AppNavigationController: UINavigationController {
	private var themedStatusBarStyle: UIStatusBarStyle?

	override var preferredStatusBarStyle: UIStatusBarStyle {
		return themedStatusBarStyle ?? super.preferredStatusBarStyle
	}

	override func viewDidLoad() {
		super.viewDidLoad()
		setUpTheming()
	}
}

extension AppNavigationController: Themed {
	func applyTheme(_ theme: AppTheme) {
		themedStatusBarStyle = theme.statusBarStyle
		setNeedsStatusBarAppearanceUpdate()

		navigationBar.barTintColor = theme.barBackgroundColor
		navigationBar.tintColor = theme.barForegroundColor
		navigationBar.titleTextAttributes = [
			NSAttributedStringKey.foregroundColor: theme.barForegroundColor
		]
	}
}
```

And similarly for your `UITabViewController` subclass:

```swift
class AppTabBarController: UITabBarController {
	override func viewDidLoad() {
		super.viewDidLoad()
		setUpTheming()
	}
}

extension AppTabBarController: Themed {
	func applyTheme(_ theme: AppTheme) {
		tabBar.barTintColor = theme.barBackgroundColor
		tabBar.tintColor = theme.barForegroundColor
	}
}
```

Now in your storyboards (or in code), ensure your app's tab bar and navigation controllers are of your new subclass types.

There you have it, your app's status and navigation bars will now respond to theme changes. Super neat!

With each component and view conforming to `Themed`, you'll find the entire app responds when the theme is changed. Keeping the logic of theme changes tightly coupled with each individual component means everything takes care of itself within its own scope, and everything just works!

## Cycling Themes

We'll want some functionality to cycle through the available themes, so we can alter our app's theme provider implementation to add the following:

```swift
final class AppThemeProvider: ThemeProvider {
	// ...
	private var availableThemes: [AppTheme] = [.light, .dark]
	// ...
	func nextTheme() {
		guard let nextTheme = availableThemes.rotate() else {
			return
		}
		currentTheme = nextTheme
	}
}
```

We list the available themes inside our theme provider and expose a `nextTheme()` function that will cycle through them. Then we can simply call `AppThemeProvider.shared.nextTheme()` whenever we want to toggle the theme and everything will update.

> Wait, what's that `Array.rotate()` method? We need a way to cycle through a list of values, and a neat way to achieve this without having variables tracking indexes is to simply get the last element of the array, and then move that element to the beginning of the array. This can be repeated in order to cycle through all the values.<br />
> See implementation: <a href="https://github.com/latenightswift/night-mode/blob/master/Night%20Mode/Helpers/ArrayExtensions.swift">Array.rotate</a>

## Animation

We want to polish things off nicely and add a nice fade animation between theme changes. We could animate each property change inside every `applyTheme()` method, but given the entire window will be changing, it's actually less code, cleaner and more efficient to get `UIKit` to perform a snapshot transition of the entire window.

Let's tweak the app's theme provider once more to give us this functionality:

```swift
final class AppThemeProvider: ThemeProvider {
	// ...
	var currentTheme: AppTheme {
		// ...
		set {
			setNewTheme(newValue)
		}
	}
	// ...
	private func setNewTheme(_ newTheme: AppTheme) {
		let window = UIApplication.shared.delegate!.window!! // 🤞🏻
		UIView.transition(
			with: window,
			duration: 0.3,
			options: [.transitionCrossDissolve],
			animations: {
				self.theme.value = newTheme
			},
			completion: nil
		)
	}
}
```

As you can see, we've wrapped setting the theme's new value in a `UIView` cross-dissolve transition. As all `applyTheme()` methods will be called as a result of setting the theme's new value, all changes will occur inside the transition's animation block.

For this operation we need the app's window, and in this example I wrote more force unwraps (on a single line!) than should exist in the entire app! Being realistic though, this should be totally fine. Let's face it, if your app doesn't have a delegate and window you have bigger problems — but feel free to modify this to be more defensive in your specific implementation.

---

So there we have it, a working implementation of Night Mode! I hope you've enjoyed this deep-dive into theming, and if you want to play with a working project then you can take the sample code for a spin.

> Sample code: [github.com/latenightswift/night-mode](https://github.com/latenightswift/night-mode)

If you found this post useful then feel free to follow @{{ site.twitter.username }} on Twitter or [Subscribe via Email]({{ site.subscribe_url }}) to get notified about future posts.
