# frozen_string_literal: true
require 'xcodeproj'

proj_path = 'Pods/Pods.xcodeproj'
proj = Xcodeproj::Project.open(proj_path)

proj.targets.each do |target|
  next unless target.name == 'BoringSSL-GRPC'

  target.build_configurations.each do |config|
    flags = Array(config.build_settings['OTHER_CFLAGS'])
    other_cxx = Array(config.build_settings['OTHER_CPLUSPLUSFLAGS'])

    cleaned_flags = flags.reject { |f| f.strip == '-G' }
    cleaned_cxx = other_cxx.reject { |f| f.strip == '-G' }

    config.build_settings['OTHER_CFLAGS'] = cleaned_flags
    config.build_settings['OTHER_CPLUSPLUSFLAGS'] = cleaned_cxx
  end
end

proj.save
puts "✅ Fully purged -G flag from BOTH C and C++ build settings for BoringSSL-GRPC."
