import UIKit

class ARKitContainerView: UIView {

    let controller: ARBodyTrackingViewController

    init(controller: ARBodyTrackingViewController) {
        self.controller = controller
        super.init(frame: .zero)

        controller.view.frame = bounds
        controller.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(controller.view)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        controller.view.frame = bounds
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
