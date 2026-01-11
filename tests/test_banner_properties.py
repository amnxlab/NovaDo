"""
Property-Based Tests for Task Matrix Banner Feature
Tests correctness properties defined in design.md

Feature: task-matrix-banner
"""
import pytest
from hypothesis import given, strategies as st, settings


# ============================================
# Property 2: Focal Point Coordinate Bounds
# ============================================
# *For any* focal point coordinates set by a user, both X and Y values 
# should be clamped to the range [0, 100] representing percentages.
# **Validates: Requirements 3.3, 5.2**

def clamp_focal_point(x: int, y: int) -> tuple[int, int]:
    """Clamp focal point coordinates to valid range [0, 100]"""
    clamped_x = max(0, min(100, x))
    clamped_y = max(0, min(100, y))
    return (clamped_x, clamped_y)


@given(
    x=st.integers(min_value=-1000, max_value=1000),
    y=st.integers(min_value=-1000, max_value=1000)
)
@settings(max_examples=100)
def test_focal_point_bounds_property(x: int, y: int):
    """
    Property 2: Focal Point Coordinate Bounds
    For any focal point coordinates, the result should be clamped to [0, 100].
    
    **Validates: Requirements 3.3, 5.2**
    """
    clamped_x, clamped_y = clamp_focal_point(x, y)
    
    # Both coordinates must be within [0, 100]
    assert 0 <= clamped_x <= 100, f"X coordinate {clamped_x} out of bounds"
    assert 0 <= clamped_y <= 100, f"Y coordinate {clamped_y} out of bounds"
    
    # If input was already in range, output should equal input
    if 0 <= x <= 100:
        assert clamped_x == x
    if 0 <= y <= 100:
        assert clamped_y == y
    
    # If input was below 0, output should be 0
    if x < 0:
        assert clamped_x == 0
    if y < 0:
        assert clamped_y == 0
    
    # If input was above 100, output should be 100
    if x > 100:
        assert clamped_x == 100
    if y > 100:
        assert clamped_y == 100


# ============================================
# Property 3: Focal Point to CSS Mapping
# ============================================
# *For any* focal point coordinates (x%, y%), the resulting CSS 
# `object-position` property should be set to `{x}% {y}%`.
# **Validates: Requirements 3.4, 3.5**

def focal_point_to_css(x: int, y: int) -> str:
    """Convert focal point coordinates to CSS object-position value"""
    clamped_x, clamped_y = clamp_focal_point(x, y)
    return f"{clamped_x}% {clamped_y}%"


@given(
    x=st.integers(min_value=0, max_value=100),
    y=st.integers(min_value=0, max_value=100)
)
@settings(max_examples=100)
def test_focal_point_css_mapping_property(x: int, y: int):
    """
    Property 3: Focal Point to CSS Mapping
    For any valid focal point coordinates, the CSS output should be formatted as '{x}% {y}%'.
    
    **Validates: Requirements 3.4, 3.5**
    """
    css_value = focal_point_to_css(x, y)
    
    # CSS value should be in correct format
    assert css_value == f"{x}% {y}%", f"Expected '{x}% {y}%', got '{css_value}'"
    
    # Should contain two percentage values
    parts = css_value.split()
    assert len(parts) == 2, f"Expected 2 parts, got {len(parts)}"
    
    # Each part should end with %
    assert parts[0].endswith('%'), f"First part should end with %"
    assert parts[1].endswith('%'), f"Second part should end with %"
    
    # Values should be parseable as integers
    x_val = int(parts[0].rstrip('%'))
    y_val = int(parts[1].rstrip('%'))
    assert x_val == x
    assert y_val == y


# ============================================
# Property 4: File Size Validation
# ============================================
# *For any* uploaded file exceeding 5MB (5,242,880 bytes), 
# the system should reject the upload with an error.
# **Validates: Requirements 2.4**

MAX_BANNER_SIZE = 5 * 1024 * 1024  # 5MB in bytes


def validate_file_size(size_bytes: int) -> tuple[bool, str | None]:
    """Validate file size for banner upload"""
    if size_bytes > MAX_BANNER_SIZE:
        return (False, "Image must be less than 5MB")
    return (True, None)


@given(size_bytes=st.integers(min_value=0, max_value=20 * 1024 * 1024))
@settings(max_examples=100)
def test_file_size_validation_property(size_bytes: int):
    """
    Property 4: File Size Validation
    For any file size, files exceeding 5MB should be rejected.
    
    **Validates: Requirements 2.4**
    """
    is_valid, error = validate_file_size(size_bytes)
    
    if size_bytes <= MAX_BANNER_SIZE:
        # Files at or below 5MB should be accepted
        assert is_valid is True, f"File of {size_bytes} bytes should be accepted"
        assert error is None
    else:
        # Files above 5MB should be rejected
        assert is_valid is False, f"File of {size_bytes} bytes should be rejected"
        assert error is not None
        assert "5MB" in error


# ============================================
# Property 5: Accepted File Types
# ============================================
# *For any* uploaded file with MIME type in [image/jpeg, image/png, image/webp, image/gif], 
# the system should accept the upload.
# **Validates: Requirements 2.2**

ALLOWED_BANNER_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}


def validate_file_type(mime_type: str) -> tuple[bool, str | None]:
    """Validate file type for banner upload"""
    if mime_type not in ALLOWED_BANNER_TYPES:
        return (False, "Please upload a JPEG, PNG, WebP, or GIF image")
    return (True, None)


@given(mime_type=st.sampled_from([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',  # Valid types
    'image/bmp', 'image/tiff', 'image/svg+xml',  # Invalid image types
    'application/pdf', 'text/plain', 'video/mp4'  # Non-image types
]))
@settings(max_examples=100)
def test_file_type_validation_property(mime_type: str):
    """
    Property 5: Accepted File Types
    Only JPEG, PNG, WebP, and GIF images should be accepted.
    
    **Validates: Requirements 2.2**
    """
    is_valid, error = validate_file_type(mime_type)
    
    if mime_type in ALLOWED_BANNER_TYPES:
        # Allowed types should be accepted
        assert is_valid is True, f"MIME type {mime_type} should be accepted"
        assert error is None
    else:
        # Other types should be rejected
        assert is_valid is False, f"MIME type {mime_type} should be rejected"
        assert error is not None


# ============================================
# Unit Tests for Edge Cases
# ============================================

def test_focal_point_center_default():
    """Test that default focal point is center (50%, 50%)"""
    css = focal_point_to_css(50, 50)
    assert css == "50% 50%"


def test_focal_point_corners():
    """Test focal point at all corners"""
    assert focal_point_to_css(0, 0) == "0% 0%"      # Top-left
    assert focal_point_to_css(100, 0) == "100% 0%"  # Top-right
    assert focal_point_to_css(0, 100) == "0% 100%"  # Bottom-left
    assert focal_point_to_css(100, 100) == "100% 100%"  # Bottom-right


def test_file_size_boundary():
    """Test file size at exact 5MB boundary"""
    # Exactly 5MB should be accepted
    is_valid, _ = validate_file_size(5 * 1024 * 1024)
    assert is_valid is True
    
    # One byte over should be rejected
    is_valid, _ = validate_file_size(5 * 1024 * 1024 + 1)
    assert is_valid is False


def test_all_allowed_types_accepted():
    """Test that all allowed MIME types are accepted"""
    for mime_type in ALLOWED_BANNER_TYPES:
        is_valid, error = validate_file_type(mime_type)
        assert is_valid is True, f"{mime_type} should be accepted"
        assert error is None
