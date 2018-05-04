---
layout: post
title: Implementing Night Mode
number: 1
description: "Post #1 of Late Night Swift! We're kicking things off by looking into building Night Mode, an ever important feature as more and more people use their devices at night."
excerpt: "Post #1 of Late Night Swift! We're kicking things off by looking into building Night Mode, an ever important feature as more and more people use their devices at night."
---

Welcome to post #1 of Late Night Swift! How better to kick things off than to look at building Night Mode, an ever important feature as more and more people use their devices at night.

![Night node demonstration](https://github.com/latenightswift/night-mode/raw/master/Preview.gif)

Our goal is to make it super simple to apply themes to your UI components and to animate the transitions between themes. To achieve this we'll build a protocol called `Themed`, and anything can conform to it take part in theming.

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

Thinking a little about the behaviour leads us to outline some initial requirements:

- Somewhere central to store and change the current theme.
- A theme type that will consist mainly of labelled colour definitions.
- A mechanism to notify interested parts of our app when the current theme changes.
- The ability for anything to partake in theming in a clean, Swifty way.
- To change the app's status bar, tab bar and navigation bars alongside custom views and view controllers.
- To perform the theme changes with a nice cross-dissolve animation.

There's also no reason why an app that supports Night Mode couldn't support a number of other themes.

With those thoughts in mind, let's jump in and model the main actors.

## Definition of Theming Protocols

Let's first define what we mean when we say we need somewhere that stores the current theme and that allows us to subscribe to be notified when the theme changes.

```swift
/// Describes a type that holds a current `Theme` and allows
/// an object to be notified when the theme is changed.
protocol ThemeProvider {
	/// Placeholder for the theme type that the app will actually use
	associatedtype Theme

	/// The current theme that is active
	var currentTheme: Theme { get }

	/// Subscribe to be notified when the theme changes. Handler will be
	/// removed from subscription when `object` is deallocated.
	func subscribeToChanges(_ object: AnyObject, handler: @escaping (Theme) -> Void)
}
```

`ThemeProvider` describes something that we can grab the current theme from at a single point in time, and also somewhere we can subscribe to to be notified about theme changes over time.

Note that we've made `Theme` an [associated type](https://developer.apple.com/library/content/documentation/Swift/Conceptual/Swift_Programming_Language/Generics.html#//apple_ref/doc/uid/TP40014097-CH26-ID189). We don't want to define a specific type here as we want the app's implementation to be able to represent themes however they wish.

The subscription mechanism will work by holding on to a weak reference of `object`, and when the object is deallocated it will be removed from the list of subscriptions. We'll use this method instead of `Notification` and `NotificationCenter` because it will allow us to use [protocol extensions](https://developer.apple.com/library/content/documentation/Swift/Conceptual/Swift_Programming_Language/Protocols.html#//apple_ref/doc/uid/TP40014097-CH25-ID521) to avoid lots of boilerplate/duplicated code, which would be more difficult to achieve using notifications.

Now we've defined somewhere that manages the current theme, let's look at how something might consume it. An object that wants to be "themed" will need to know about the current theme at the time the object is instantiated / set up, and to also be notified if the theme changes during the object's lifetime.

```swift
/// Describes a type that can have a theme applied to it
protocol Themed {
	/// A Themed type needs to know about what concrete type the
	/// ThemeProvider is. So we don't clash with the protocol,
	/// let's call this associated type _ThemeProvider
	associatedtype _ThemeProvider: ThemeProvider

	/// Will return the current app-wide theme provider
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

Using a handy protocol extension when the conforming type is `AnyObject`, we've managed to remove the need for each conformance to do the "apply initial theme + subscribe + re-apply future themes when they change" dance. This is all packaged up in the `setUpTheming()` method that each object can call.

To make this happen, the themed object needs to know what the current theme provider is. When we know the concrete type of the app's theme provider (whatever type will end up conforming to `ThemeProvider`) we'll be able to provide an extension on `Themed` to return the app's theme provider, which we'll do in a minute or two.

All of this means the conforming object only needs call `setUpTheming()` once, and provide an implementation of `applyTheme()` to do it's own thing to configure itself with the theme.

## App Implementation

Now we've defined the theming API we can do the fun stuff and start applying it to our app. Let's define our app's theme type and declare our light and dark themes.

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

Now it's time to build our app's theme provider.

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

	init() {
		// We'll default to the light theme to start with, but
		// this could read directly from UserDefaults to get
		// the user's last theme choice.
		theme = SubscribableValue<AppTheme>(value: .light)
	}

	func subscribeToChanges(_ object: AnyObject, handler: @escaping (AppTheme) -> Void) {
		theme.subscribe(object, using: handler)
	}
}
```

Two things may stand out here: first, the use of a static shared singleton, and second, what on earth is a `SubscribableValue`?

### Singleton? Really?

We've created a shared app-wide singleton instance of our theme provider, which is usually a [big red flag](https://www.swiftbysundell.com/posts/avoiding-singletons-in-swift).

Given that our theme provider is nicely unit testable, and that theming is a presentation layer body of work, this is an acceptable trade-off.

In the real world, the app's UI is built up from multiple screens, each with a huge hierarchy of nested views. Using dependency injection for a view model or view controller is easy enough, but to inject dependencies into every view on-screen would be significant work and a lot more lines of code to manage.

Generally speaking, your business logic should be unit tested, and you shouldn't find the need to be testing down to the presentation layer. This is actually a very interesting topic and something we'll be talking about in a future post.

### SubscribableValue

So you're probably wondering what on earth that generic `SubscribableValue` is! The theme provider requires objects to subscribe to current theme changes. This logic is fairly simple and could easily be baked into the theme provider, however, the behaviour of subscribing to a value is something that can, and should, be moved away into something more generic.

A separate, generic implementation of "a value that can be subscribed to" means it can be tested in isolation and re-used. It also cleans up the theme provider allowing it do manage only it's _specific responsibility_.

Of course, if you're using Rx (or equivalent) in your project then you can use something similar instead, such as `Variable`/`BehaviorSubject`.

The implementation of `SubscribableValue` looks like this:

```swift
/// A box that allows us to weakly hold on to an object
struct Weak<Object: AnyObject> {
	weak var value: Object?
}

/// Stores a value of type T, and allows objects to subscribe to
/// be notified with this value is changed.
struct SubscribableValue<T> {
	private typealias Subscription = (object: Weak<AnyObject>, handler: (T) -> Void)
	private var subscriptions: [Subscription] = []

	var value: T {
		didSet {
			for (object, handler) in subscriptions where object.value != nil {
				handler(value)
			}
		}
	}

	init(value: T) {
		self.value = value
	}

	mutating func subscribe(_ object: AnyObject, using handler: @escaping (T) -> Void) {
		subscriptions.append((Weak(value: object), handler))
		cleanupSubscriptions()
	}

	private mutating func cleanupSubscriptions() {
		subscriptions = subscriptions.filter({ entry in
			return entry.object.value != nil
		})
	}
}
```

`SubscribableValue` holds an array of weak object references and closures. When the value is changed we iterate over these subscriptions in the `didSet` and call the closures. It also takes care of some cleanup by removing subscriptions where the object has been deallocated.

Now we have a working theme provider there's just one more thing we need to do before this is all ready to use, and that's to add an extension to `Themed` that returns our app's single `AppThemeProvider` instance.

```swift
extension Themed where Self: AnyObject {
	var themeProvider: AppThemeProvider {
		return AppThemeProvider.shared
	}
}
```

If you remember from the `Themed` protocol and extension, objects need this property to help drive the handy `setUpTheming()` method, which handles subscribing to the theme provider. This now means the only thing each `Themed` object needs to do is implement `applyTheme()`. Perfect!

## Getting Themed

Now we have everything we need to get our views, view controllers and app bars to respond nicely to theme changes, so let's get conforming!

### UIView

Say you have a nice `UIView` subclass and want it to respond to theme changes. All you have to do is conform to `Themed`, call `setUpTheming()` in `init` and make sure all theme related setup goes within `applyTheme()`.

Don't forget `applyTheme()` gets called once at set up time too, so all your theming code can stay in one happy place.

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

You'll also want to update the appearance of the app's status and navigation bars based on the current theme. Assuming your app is using [view controller based status bar appearance](https://developer.apple.com/library/content/documentation/General/Reference/InfoPlistKeyReference/Articles/iPhoneOSKeys.html#//apple_ref/doc/uid/TP40009252-SW29) (which is now the default), you can subclass your navigation controller and conform to themed:


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

With each component and view conforming to `Themed`, you'll find the entire app responds when the theme is changed.

Keeping the logic of theme changes tightly coupled with each individual component means everything takes care of itself within its own scope, and everything just works!

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

extension Array {
	/// Move the last element of the array to the beginning
	///  - Returns: The element that was moved
	mutating func rotate() -> Element? {
		guard let lastElement = popLast() else {
			return nil
		}
		insert(lastElement, at: 0)
		return lastElement
	}
}
```

We list the available themes inside our theme provider and expose a `nextTheme()` function that will cycle through them.

A neat way to achieve this cycling through an array of themes, without having a variable to track indexes, is to simply get the last element of the array, and then move that element to the beginning of the array. This can be repeated in order to cycle through all the values. We do this by extending `Array` and writing a `mutating` method called `rotate()`.

Now we can simply call `AppThemeProvider.shared.nextTheme()` whenever we want to toggle the theme and everything will update.

## Animation

We want to polish things off nicely and add a cross-fade animation between theme changes. We could animate each property change inside every `applyTheme()` method, but given the entire window will be changing, it's actually less code, cleaner and more efficient to get `UIKit` to perform a snapshot transition of the entire window.

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

As you can see, we've wrapped changing the theme's value in a `UIView` cross-dissolve transition. As all `applyTheme()` methods will be called as a result of setting the theme's new value, all changes will occur inside the transition's animation block.

For this operation we need the app's window, and in this example there are more force unwraps (on a single line!) than should probably exist in the entire app! Being realistic though, this should be totally fine. Let's face it, if your app doesn't have a delegate and window you have bigger problems — but feel free to modify this to be more defensive in your specific implementation.

![Night node demonstration](https://github.com/latenightswift/night-mode/raw/master/Preview.gif)

---

So there we have it, a working implementation of Night Mode and a deep-dive into theming. If you want to play with a working implementation then you can take the sample code for a spin.

> Sample code: [github.com/latenightswift/night-mode](https://github.com/latenightswift/night-mode)

If you enjoyed this post then feel free to follow @{{ site.twitter.username }} on Twitter or [Subscribe via Email]({{ site.subscribe_url }}) to get notified about future posts.

Thanks for reading! 🌙
