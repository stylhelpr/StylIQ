# 🧩 CocoaPods Installer Patch — fixes "ArgumentError (given 3, expected 0)"
#   Compatible with CocoaPods 1.15.x on Ruby 2.7.x
#   Safe to remove once CocoaPods ≥ 1.16.0 is used.

module Pod
  class Command
    class << self
      alias_method :__orig_installer_for_config, :installer_for_config rescue nil

      def installer_for_config(*args)
        # Handle legacy three-argument call
        if args.length == 3
          config, sandbox, lockfile = args
          Pod::Installer.new(config, sandbox, lockfile)
        else
          __orig_installer_for_config ?
            __orig_installer_for_config(*args) :
            Pod::Installer.new(*args)
        end
      end
    end
  end
end
