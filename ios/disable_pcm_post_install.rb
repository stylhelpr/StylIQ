# Local-only patch to disable Explicit Precompiled Modules for Xcode 16
Pod::HooksManager.register('StylIQ', :post_install) do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      s = config.build_settings
      # ⛔️ Completely disable PCM
      s['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
      s['CLANG_ENABLE_MODULE_IMPLEMENTATION'] = 'NO'
      s['DEFINES_MODULE'] = 'YES'
      s['ENABLE_MODULES'] = 'YES'
      s['SWIFT_STRICT_CONCURRENCY'] = 'complete'
      s['OTHER_SWIFT_FLAGS'] ||= ['$(inherited)']
      s['OTHER_SWIFT_FLAGS'] << '-Xfrontend' << '-disable-availability-checking'
      s['OTHER_SWIFT_FLAGS'] << '-Xcc' << '-Wno-error'
    end
  end
end
