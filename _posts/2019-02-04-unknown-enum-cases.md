---
layout: post
title: Unknown Enum Cases
description: "Using the hidden power of CaseIterable to represent unknown values in RawRepresentable types."
excerpt: "Using the hidden power of CaseIterable to represent unknown values in RawRepresentable types."
subtitle: "Using the hidden power of CaseIterable to represent unknown values in RawRepresentable types."
---

Sometimes we need the ability to be less strict when parsing API responses, gracefully handling new values that are not recognised. When these values are modelled as enums we have a problem: decoding will fail if we receive an unexpected value! If these enums are used in many models it's worthwhile looking for an elegant solution.

We'll demonstrate the journey towards solving this problem with the following example:

```swift
enum Material: String, Codable {
	case wood, metal, glass, other
}
```

And the behaviour we're looking for is:

	"wood" → .wood
	"metal" → .metal
	"glass" → .glass
	"stone" → .other

## Approach 1: Customise all the decoding

A first approach could be to simply implement custom decoding for each of the enums in question:

```swift
extension Material {
	init(from decoder: Decoder) throws {
		let container = try decoder.singleValueContainer()
		let rawMaterial = try container.decode(String.self)
		self = Material(rawValue: rawMaterial) ?? .other
	}
}
```

Here we map unknown values to the `other` case. Any behaviours based on these unknown values will not have been defined, so it's not important for us to distinguish between them; we only need to know that it's a value we didn't recognise.

This works well, however when many enums need the same treatment there's a lot of repetition. We can do better!

## Approach 2: Keep things DRY

A solution to all of the duplicated code is to wrap it all up into something we can reuse:

```swift
extension RawRepresentable where RawValue: Decodable {
	init(from decoder: Decoder, default: Self) throws {
		let container = try decoder.singleValueContainer()
		let rawValue = try container.decode(RawValue.self)
		self = Self(rawValue: rawValue) ?? `default`
	}
}
```

If a `RawRepresentable`'s `RawValue` type is decodable, we're offering an initialiser that tries to decode a raw value of that type. If that raw value does not match a represented value, it will fallback to a provided default.

We can now reduce each enum's custom decoding to:

```swift
extension Material {
	init(from decoder: Decoder) throws {
		self = try Material(from: decoder, default: .other)
	}
}
```

That's pretty tidy! However, when spending a little more time thinking about the actual problem we're trying to solve (a habit worthwhile fostering), we soon realise we're not there yet!

## Approach 3: Stepping back

Until now we've been tackling this problem at the decoding level, but by doing this, we're not providing the fallback behaviour when instantiating values via `Material(rawValue:)`. We're exposing an `other` case, so the consumer of this type would expect for it to be used consistently, no matter how the value is created.

This can be achieved by providing a raw value initialiser that satisfies the `RawRepresentable` protocol's requirement, and whose implementation maps unknown values to a specific case.

We need a way for a `RawRepresentable` type to opt-in to this unknown value behaviour. In doing so, it should also expose which value it wants to use as its fallback value. This idea can be wrapped into a protocol called `UnknownCaseRepresentable`, which we can extend to provide our raw value initialiser:

```swift
protocol UnknownCaseRepresentable: RawRepresentable, CaseIterable where RawValue: Equatable {
	static var unknownCase: Self { get }
}

extension UnknownCaseRepresentable {
	init(rawValue: RawValue) {
		let value = Self.allCases.first(where: { $0.rawValue == rawValue })
		self = value ?? Self.unknownCase
	}
}
```

Now we can see where the `CaseIterable` magic comes in! As we're defining our own `init(rawValue:)` we cannot defer to the default implementation to attempt to find a case matching the given raw value. Prior to Swift 4.2 and the introduction of `CaseIterable` we'd be stuck here. Thankfully, we can now use the magical `allCases` property to find the case with a matching raw value, falling back to `unknownCase` if needed.

The constraint `RawValue: Equatable` is to ensure we can compare the raw values in our `first(where:)` closure.

All enums that conform to `UnknownCaseRepresentable` will now get the unknown value fallback behaviour when initialising/decoding with no further work:

```swift
enum Material: String {
	case wood, metal, glass, other
}

extension Material: Codable {}

extension Material: UnknownCaseRepresentable {
	static let unknownCase: Material = .other
}

Material(rawValue: "glass")
// .glass

Material(rawValue: "stone")
// .other

let json = """
["glass", "stone"]
"""
try? JSONDecoder().decode([Material].self, from: json.data(using: .utf8)!)
// [.glass, .other]
```

The eagle-eyed reader will notice that we defined `init(rawValue:)`, but `RawRepresentable` requires a failable `init?(rawValue:)`. It turns out that a failable initialiser requirement is able to be satisfied by a non-failable initialiser. When thinking about it, it actually makes sense. _TIL!_

As the raw value initialiser is no longer failable, `Material(rawValue:)` doesn't return an optional, which is perfect! We already know that all raw values will produce a value, so thankfully there's no needless force-unwrapping in sight!

---

If you enjoyed this post then feel free to follow @{{ site.twitter.username }} on Twitter or [Subscribe via Email]({{ site.subscribe_url }}) to get notified about future posts.

Thanks for reading! 🌙
