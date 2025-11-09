require 'xcodeproj'
path = 'Pods/Pods.xcodeproj'
proj = Xcodeproj::Project.open(path)

proj.targets.each do |target|
  next unless target.name == 'BoringSSL-GRPC'
  puts "🔍 Cleaning target: #{target.name}"

  target.build_configurations.each do |config|
    %w[OTHER_CFLAGS OTHER_CPLUSPLUSFLAGS OTHER_LDFLAGS].each do |key|
      flags = Array(config.build_settings[key])
      if flags.any? { |f| f.to_s.include?('-G') }
        puts "  Removing -G from #{key} (#{config.name})"
        config.build_settings[key] = flags.reject { |f| f.to_s.include?('-G') }
      end
    end
  end
end

proj.save
puts "✅ Finished purging all -G flags from BoringSSL-GRPC."
