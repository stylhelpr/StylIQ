# 🧩 CocoaPods 1.15+ safe shim
# Fixes undefined method errors for aggregate_targets in new installers
module Pod
  class Installer
    alias_method :orig_generate_pods_project, :generate_pods_project rescue nil

    def generate_pods_project(*args)
      if respond_to?(:aggregate_targets) && aggregate_targets.is_a?(Array)
        aggregate_targets.compact!
      end
      if defined?(orig_generate_pods_project)
        orig_generate_pods_project(*args)
      else
        super
      end
    end
  end
end
