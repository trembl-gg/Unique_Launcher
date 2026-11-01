fn main() {
    println!("cargo:rerun-if-changed=unique иконка.ico");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let out = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
        std::fs::copy("unique иконка.ico", out.join("launcher.ico")).unwrap();
        let mut resource = winresource::WindowsResource::new();
        resource
            .set_icon(out.join("launcher.ico").to_str().unwrap())
            .set("ProductName", "UNIQUE LAUNCHER")
            .set("FileDescription", "UNIQUE LAUNCHER");
        if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("gnu") {
            // windres forwards include paths through a shell; avoid that path for directories with spaces.
            resource
                .set_icon("launcher.ico")
                .write_resource_file(out.join("launcher.rc"))
                .unwrap();
            let status = std::process::Command::new("windres")
                .current_dir(&out)
                .args(["launcher.rc", "-O", "coff", "-o", "launcher.o"])
                .status()
                .expect("Install MinGW windres");
            assert!(status.success(), "Windows resource compilation failed");
            println!("cargo:rustc-link-arg={}", out.join("launcher.o").display());
        } else {
            resource
                .compile()
                .expect("Windows resource compilation failed; install MSVC Build Tools");
        }
    }
}
