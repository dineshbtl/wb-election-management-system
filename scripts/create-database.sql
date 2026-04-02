-- Create database schema for CCTV Survey Application

-- Users table for employee authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    division VARCHAR(50) NOT NULL,
    depot VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'surveyor',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Divisions table
CREATE TABLE IF NOT EXISTS divisions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    region VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Depots table
CREATE TABLE IF NOT EXISTS depots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    division_id INTEGER REFERENCES divisions(id),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bus stations table
CREATE TABLE IF NOT EXISTS bus_stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    depot_id INTEGER REFERENCES depots(id),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bus stands table
CREATE TABLE IF NOT EXISTS bus_stands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bus_station_id INTEGER REFERENCES bus_stations(id),
    platform_number VARCHAR(10),
    capacity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    survey_id VARCHAR(20) UNIQUE NOT NULL,
    division_id INTEGER REFERENCES divisions(id),
    depot_id INTEGER REFERENCES depots(id),
    bus_station_id INTEGER REFERENCES bus_stations(id),
    bus_stand_id INTEGER REFERENCES bus_stands(id),
    surveyor_id INTEGER REFERENCES users(id),
    survey_purpose VARCHAR(50) NOT NULL,
    survey_date DATE NOT NULL,
    completion_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Camera installations table
CREATE TABLE IF NOT EXISTS camera_installations (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id),
    camera_type VARCHAR(20) NOT NULL,
    serial_number VARCHAR(50),
    pole_location TEXT,
    distance_between_cameras INTEGER,
    work_status VARCHAR(50),
    installation_date DATE,
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Survey photos table
CREATE TABLE IF NOT EXISTS survey_photos (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id),
    photo_url VARCHAR(255) NOT NULL,
    photo_type VARCHAR(50),
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample divisions
INSERT INTO divisions (name, code, region) VALUES
('Pune', 'PUN', 'Western Maharashtra'),
('Mumbai', 'MUM', 'Mumbai Metropolitan'),
('Nashik', 'NSK', 'Northern Maharashtra'),
('Nagpur', 'NGP', 'Vidarbha'),
('Aurangabad', 'AUR', 'Marathwada')
ON CONFLICT (code) DO NOTHING;

-- Insert sample depots
INSERT INTO depots (name, code, division_id, address) VALUES
('Pune Central', 'PUN-CEN', 1, 'Pune Central Bus Station, Pune'),
('Pune Eastern', 'PUN-EST', 1, 'Eastern Depot, Pune'),
('Mumbai Dadar', 'MUM-DAD', 2, 'Dadar Bus Depot, Mumbai'),
('Mumbai Western', 'MUM-WST', 2, 'Western Depot, Mumbai'),
('Nashik Road', 'NSK-RD', 3, 'Nashik Road Depot, Nashik'),
('Nagpur Central', 'NGP-CEN', 4, 'Central Depot, Nagpur'),
('Aurangabad Central', 'AUR-CEN', 5, 'Central Depot, Aurangabad')
ON CONFLICT (code) DO NOTHING;

-- Insert sample users
INSERT INTO users (username, password_hash, full_name, employee_id, division, depot, role) VALUES
('rajesh.kumar', '$2b$10$example_hash_1', 'Rajesh Kumar', 'EMP001', 'Pune', 'Pune Central', 'surveyor'),
('priya.sharma', '$2b$10$example_hash_2', 'Priya Sharma', 'EMP002', 'Mumbai', 'Mumbai Dadar', 'surveyor'),
('amit.patil', '$2b$10$example_hash_3', 'Amit Patil', 'EMP003', 'Nashik', 'Nashik Road', 'surveyor'),
('admin', '$2b$10$example_hash_admin', 'System Administrator', 'ADM001', 'All', 'All', 'admin')
ON CONFLICT (username) DO NOTHING;
