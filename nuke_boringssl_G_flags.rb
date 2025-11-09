require 'xcodeproj'

proj = Xcodeproj::Project.open('ios/Pods/Pods.xcodeproj')

proj.targets.each do |target|
  next unless target.name == 'BoringSSL-GRPC'
  target.build_configurations.each do |config|
    flags = Array(config.build_settings['OTHER_CFLAGS'])
    flags.reject! { |f| f.to_s.strip == '-G' }
    config.build_settings['OTHER_CFLAGS'] = flags
  end
end

proj.save
puts "✅ Removed all '-G' flags from BoringSSL-GRPC in ios/Pods.xcodeproj."
