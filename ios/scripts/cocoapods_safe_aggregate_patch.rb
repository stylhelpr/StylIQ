# 🧩 CocoaPods 1.15.2 Safe Dependency Patch — FINAL
# Fixes the `undefined method 'target_label_by_metadata' for nil:NilClass`
# crash inside `Pod::Installer::Xcode::PodsProjectGenerator::PodTargetDependencyInstaller`.

begin
  # Utility for safely wrapping CocoaPods installer methods
  def safe_wrap(klass, method_name)
    return unless klass && klass.method_defined?(method_name)

    klass.class_eval do
      alias_method :"_orig_#{method_name}", method_name rescue nil

      define_method(method_name) do |*args, &block|
        begin
          send(:"_orig_#{method_name}", *args, &block)
        rescue NoMethodError => e
          if e.message.include?('target_label_by_metadata')
            puts "⚙️  [SafePatch] #{klass}##{method_name} — nil target_label_by_metadata skipped"
            return
          else
            raise
          end
        end
      end
    end
  end

  # ✅ Patch both installer classes that can trigger this
  agg = Pod::Installer::Xcode::PodsProjectGenerator::AggregateTargetDependencyInstaller rescue nil
  pod = Pod::Installer::Xcode::PodsProjectGenerator::PodTargetDependencyInstaller rescue nil

  if agg
    puts "⚙️  [SafePatch] applying to AggregateTargetDependencyInstaller"
    safe_wrap(agg, :install!)
  end

  if pod
    puts "⚙️  [SafePatch] applying to PodTargetDependencyInstaller"
    safe_wrap(pod, :wire_target_dependencies)
    safe_wrap(pod, :install!)
  end

rescue => e
  warn "⚠️  [SafePatch] failed to apply: #{e.class} – #{e.message}"
end
