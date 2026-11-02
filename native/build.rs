fn main() {
    println!("cargo:rerun-if-changed=../unique иконка.ico");
    let out = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
    std::fs::copy("../unique иконка.ico", out.join("launcher.ico")).unwrap();
    let mut resource = winresource::WindowsResource::new();
    resource
        .set_icon(out.join("launcher.ico").to_str().unwrap())
        .set("ProductName", "UNIQUE LAUNCHER")
        .set("FileDescription", "UNIQUE LAUNCHER");
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("gnu") {
        resource
            .set_icon("launcher.ico")
            .write_resource_file(out.join("launcher.rc"))
            .unwrap();
        assert!(std::process::Command::new("windres")
            .current_dir(&out)
            .args(["launcher.rc", "-O", "coff", "-o", "launcher.o"])
            .status()
            .unwrap()
            .success());
        println!("cargo:rustc-link-arg={}", out.join("launcher.o").display());
    } else {
        resource.compile().unwrap();
    }
}
