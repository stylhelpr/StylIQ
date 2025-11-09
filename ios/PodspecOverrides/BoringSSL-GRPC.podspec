Pod::Spec.new do |s|
  s.name     = 'BoringSSL-GRPC'
  s.version  = '0.0.24'   # must match FirebaseFirestore's dependency
  s.summary  = 'Patched BoringSSL-GRPC without the -G flag or duplicate headers.'
  s.description = 'Patched version matching 0.0.24, removes invalid -G flags and disables ASM for simulator builds.'
  s.homepage = 'https://github.com/grpc/grpc'
  s.license  = { :type => 'Apache-2.0', :file => 'LICENSE' }
  s.authors  = 'gRPC Authors'

  # 🔹 Match the correct gRPC release used by Firebase
  s.source   = { :git => 'https://github.com/grpc/grpc.git', :tag => 'v1.49.1' }

  # ✅ Include all relevant TSI and BoringSSL sources
  s.source_files = [
    'src/core/tsi/**/*.{h,cc,c}',
    'third_party/boringssl-with-bazel/src/**/*.{h,cc,c}'
  ]

  s.exclude_files = [
    '**/test/**',
    '**/tool/**',
    '**/objective-c/**',
    '**/python/**',
    '**/php/**',
    '**/upb/**',
    '**/upbdefs/**'
  ]

  # ✅ Strip unsafe compiler flags
  s.compiler_flags = '-Wno-shorten-64-to-32 -Wno-documentation'

  # ✅ Correct and complete header search paths
  s.pod_target_xcconfig = {
    'GCC_PREPROCESSOR_DEFINITIONS' => 'BORINGSSL_PREFIX=GRPC OPENSSL_NO_ASM=1',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'HEADER_SEARCH_PATHS' => [
      '$(PODS_TARGET_SRCROOT)/src',
      '$(PODS_TARGET_SRCROOT)/src/core',
      '$(PODS_TARGET_SRCROOT)/src/core/tsi',
      '$(PODS_TARGET_SRCROOT)/src/core/tsi/alts/handshaker',
      '$(PODS_ROOT)/gRPC-Core/include',
      '$(PODS_ROOT)/gRPC-Core/src',
      '$(PODS_ROOT)/gRPC-C++/include'
    ].join(' ')
  }

  s.requires_arc = false
  s.ios.deployment_target = '12.0'
end
