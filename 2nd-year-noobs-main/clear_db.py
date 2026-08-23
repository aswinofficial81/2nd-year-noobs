from database import Base, engine

print("Clearing the database...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Database cleared successfully! You can now re-upload your files.")
