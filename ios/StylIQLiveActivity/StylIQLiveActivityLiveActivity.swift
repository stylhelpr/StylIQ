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

            // =========================================================
            // LOCK SCREEN — Clean, No Progress, No Waveform
            // =========================================================

            VStack(alignment: .leading, spacing: 8) {

                HStack(spacing: 16) {    // ⭐ more space between artwork + text

                    Image("free1")
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 60, height: 60)
                        .cornerRadius(8)

                    VStack(alignment: .leading, spacing: 4) {

                        Text(context.attributes.title)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        Text(context.state.message)
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.7))
                            .lineLimit(1)
                    }
                }

            }
            .padding(.horizontal, 20)
            .padding(.vertical, 20)   // ⭐ keep perfect lock-screen spacing
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 0x24/255, green: 0x24/255, blue: 0x26/255))
            .cornerRadius(16)



 // =============================================================
//  DYNAMIC ISLAND — MATCH LOCK SCREEN SPACING EXACTLY + NO ELLIPSIS
// =============================================================
} dynamicIsland: { context in

    DynamicIsland {

        // -----------------------------------------------------
        // EXPANDED — LEFT (Artwork)
        // -----------------------------------------------------
        DynamicIslandExpandedRegion(.leading) {
            Image("free1")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 60, height: 60)
                .cornerRadius(8)
                .padding(.leading, 12)
                .padding(.vertical, 6)
        }

        // -----------------------------------------------------
        // EXPANDED — CENTER (Text)
        // -----------------------------------------------------
DynamicIslandExpandedRegion(.center) {

    VStack(alignment: .leading, spacing: 4) {

        Text(context.attributes.title)
            .font(.system(size: 17, weight: .semibold))
            .foregroundColor(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .allowsTightening(true)

        Text(context.state.message)
            .font(.system(size: 14))
            .foregroundColor(.white.opacity(0.7))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .allowsTightening(true)
    }
    .padding(.leading, 12)
    .padding(.trailing, 16)
   .offset(y: 0)
}

    }

    // ---------------------------------------------------------
    // COMPACT LEADING
    // ---------------------------------------------------------
    compactLeading: {
        Image("free1")
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: 22, height: 22)
            .cornerRadius(4)
    }

    compactTrailing: { EmptyView() }
    minimal: { EmptyView() }
}
}
    
}
