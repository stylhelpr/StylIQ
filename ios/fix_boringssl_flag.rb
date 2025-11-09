# frozen_string_literal: true
require 'xcodeproj'

project_path = 'Pods/Pods.xcodeproj'
project = Xcodeproj::Project.open(project_path)

project.targets.each do |target|
  next unless target.name == 'BoringSSL-GRPC'

  target.build_configurations.each do |config|
    flags = config.build_settings['OTHER_CFLAGS']

    # Normalize to an array
    flags = Array(flags)

    # Remove any "-G" entries cleanly
    cleaned_flags = flags.reject { |f| f.strip == '-G' }

    config.build_settings['OTHER_CFLAGS'] = cleaned_flags
  end
end

project.save
puts "✅ Removed -G flag from BoringSSL-GRPC build settings (array-safe)."
