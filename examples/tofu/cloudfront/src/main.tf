resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.bucketName}-oac"
  description                       = "Origin Access Control for website content"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "website_cdn" {
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2"
  price_class     = "PriceClass_100"
  default_root_object = "index.html"

  origin {
    domain_name = var.bucketDomainName
    origin_id   = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "allow-all"
    compress              = true
    min_ttl               = 0
    default_ttl           = 300
    max_ttl               = 1200

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/404.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

provider "aws" {
  region = var.region
}

// Create the bucket policy separately
resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = var.bucketName
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${var.bucketArn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website_cdn.arn
          }
        }
      }
    ]
  })
}

output "cloudfrontDomainName" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website_cdn.domain_name
}

output "cloudfrontDistributionId" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website_cdn.id
}

output "cloudfrontArn" {
  value = aws_cloudfront_distribution.website_cdn.arn
  description = "The ARN (Amazon Resource Name) of the Cloudfront"
}
