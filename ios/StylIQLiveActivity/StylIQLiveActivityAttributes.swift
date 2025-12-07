//
//  StylIQLiveActivityAttributes.swift
//  StylIQ
//

import Foundation
import ActivityKit
import WidgetKit

@available(iOS 16.1, *)
public struct StylIQActivityAttributes: ActivityAttributes {

    public struct ContentState: Codable, Hashable {
        public var message: String
        public init(message: String) {
            self.message = message
        }
    }

    public var title: String
    public init(title: String) {
        self.title = title
    }
}
