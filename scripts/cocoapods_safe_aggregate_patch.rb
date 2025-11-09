# 🧩 Safe Aggregate Target Patch — CocoaPods 1.14.x
# Prevents nil aggregate_targets crash inside AggregateTargetDependencyInstaller

module Pod
  class Installer
    module Xcode
      class AggregateTargetDependencyInstaller
        alias_method :old_install!, :install! rescue nil

        def install!(*args)
          if @aggregate_target.nil? || !@aggregate_target.respond_to?(:user_build_configurations)
            puts "⚙️  [SafeAggregatePatch] Skipping nil aggregate_target"
            return
          end
          old_install!(*args)
        end
      end
    end
  end
end
