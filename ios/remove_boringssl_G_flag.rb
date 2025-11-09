require 'xcodeproj'

proj_path = 'Pods/Pods.xcodeproj'
proj = Xcodeproj::Project.open(proj_path)

proj.targets.each do |t|
  next unless t.name == 'BoringSSL-GRPC'
  t.build_configurations.each do |cfg|
    flags = Array(cfg.build_settings['OTHER_CFLAGS'])
    cfg.build_settings['OTHER_CFLAGS'] = flags.reject { |f| f == '-G' }
  end
end

proj.save
puts "✅ Cleaned -G flag from BoringSSL-GRPC build configs."
