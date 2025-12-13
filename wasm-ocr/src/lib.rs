use wasm_bindgen::prelude::*;
use image::DynamicImage;

#[wasm_bindgen]
pub struct ImageProcessor {
    images: Vec<DynamicImage>,
}

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ImageProcessor {
        ImageProcessor {
            images: Vec::new(),
        }
    }

    /// 複数の画像データ（base64）を追加
    #[wasm_bindgen]
    pub fn add_image_from_base64(&mut self, base64_data: &str) -> Result<(), JsValue> {
        // data:image/png;base64, のプレフィックスを除去
        let base64 = if base64_data.starts_with("data:") {
            base64_data.split(',').nth(1).ok_or_else(|| JsValue::from_str("Invalid base64 data"))?
        } else {
            base64_data
        };

        // base64デコード
        let image_bytes = base64::decode(base64)
            .map_err(|e| JsValue::from_str(&format!("Failed to decode base64: {}", e)))?;

        // 画像を読み込み
        let img = image::load_from_memory(&image_bytes)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

        self.images.push(img);
        Ok(())
    }

    /// 画像をリサイズ（OCR用に最適化）
    #[wasm_bindgen]
    pub fn resize_images(&mut self, max_width: u32, max_height: u32) -> Result<(), JsValue> {
        for img in &mut self.images {
            let (width, height) = img.dimensions();
            
            if width <= max_width && height <= max_height {
                continue;
            }

            // アスペクト比を維持してリサイズ
            let (new_width, new_height) = if width > height {
                let ratio = max_width as f32 / width as f32;
                (max_width, (height as f32 * ratio) as u32)
            } else {
                let ratio = max_height as f32 / height as f32;
                ((width as f32 * ratio) as u32, max_height)
            };

            *img = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);
        }
        Ok(())
    }

    /// 画像をJPEG形式でエンコード（圧縮）
    #[wasm_bindgen]
    pub fn encode_as_jpeg(&self, quality: u8) -> Result<Vec<JsValue>, JsValue> {
        let mut results = Vec::new();
        
        for img in &self.images {
            let mut jpeg_data = Vec::new();
            let mut cursor = std::io::Cursor::new(&mut jpeg_data);
            
            img.write_to(&mut cursor, image::ImageOutputFormat::Jpeg(quality))
                .map_err(|e| JsValue::from_str(&format!("Failed to encode JPEG: {}", e)))?;

            // base64エンコード
            let base64 = base64::encode(&jpeg_data);
            results.push(JsValue::from_str(&format!("data:image/jpeg;base64,{}", base64)));
        }

        Ok(results)
    }

    /// 画像の数を取得
    #[wasm_bindgen]
    pub fn image_count(&self) -> usize {
        self.images.len()
    }

    /// 画像のサイズ情報を取得
    #[wasm_bindgen]
    pub fn get_image_sizes(&self) -> Vec<JsValue> {
        self.images
            .iter()
            .map(|img| {
                let (width, height) = img.dimensions();
                JsValue::from_str(&format!("{}x{}", width, height))
            })
            .collect()
    }
}

#[wasm_bindgen]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen(start)]
pub fn main() {
    init();
}

