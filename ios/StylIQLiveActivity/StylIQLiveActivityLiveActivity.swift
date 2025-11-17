//
//  StylIQLiveActivity.swift
//  StylIQLiveActivityExtension
//

import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct StylIQLiveActivity: Widget {

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: StylIQActivityAttributes.self) { context in

            // 🔒 LOCK SCREEN + BANNER UI
            VStack(spacing: 8) {
                Text(context.attributes.title)
                    .font(.headline)
                Text(context.state.message)
                    .font(.subheadline)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(.black)

        } dynamicIsland: { context in

            DynamicIsland {

                // 🟦 EXPANDED – LEADING
                DynamicIslandExpandedRegion(.leading) {
                    Text("👔")
                        .font(.title2)
                }

                // 🟩 EXPANDED – CENTER
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 4) {
                        Text(context.attributes.title)
                            .font(.headline)
                        Text(context.state.message)
                            .font(.subheadline)
                    }
                }

                // 🟥 EXPANDED – TRAILING
                DynamicIslandExpandedRegion(.trailing) {
                    Text("✨")
                        .font(.title2)
                }

                // 🟨 EXPANDED – BOTTOM
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Update: \(context.state.message)")
                        .font(.caption)
                }

           } compactLeading: {
    Text("👔")
        .frame(width: 22, height: 22)
} compactTrailing: {
    Text("✨")
        .frame(width: 22, height: 22)
} minimal: {
    Text("S")
        .frame(width: 22, height: 22)
}
        }
    }
}
