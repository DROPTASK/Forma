plugins {
    id("com.android.application")
}

val pwaUrl: String = providers.gradleProperty("pwaUrl").orElse("https://forma.example").get()
val pwaHost: String = providers.gradleProperty("pwaHost").orElse("forma.example").get()

android {
    namespace = "app.forma.fitness"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.forma.fitness"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        manifestPlaceholders["pwaUrl"] = pwaUrl
        manifestPlaceholders["pwaHost"] = pwaHost
        buildConfigField("String", "PWA_URL", "\"$pwaUrl\"")
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.browser:browser:1.8.0")
    implementation("androidx.core:core:1.13.1")
}
