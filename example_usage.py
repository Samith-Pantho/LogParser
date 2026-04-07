from iLogger import Logger
import time

# 1. Initialize the logger for your project
logger = Logger("TestProject-Alpha", savetype="file", create_by="Robot-User")

def main():
    print("🚀 Starting Example Logger...")
    
    # 2. Simple info log (auto-detects module and function!)
    logger.info("Application successfully started")
    
    time.sleep(1)
    
    # 3. Warning log
    logger.warning("Network latency detected", logtype="NETWORK")
    
    time.sleep(1)
    
    # 4. Error log (this will appear in RED in our dashboard)
    try:
        1 / 0
    except ZeroDivisionError as e:
        logger.error(f"Computation failed: {e}", logtype="SYSTEM")

    # 5. DB Storage example
    db_logger = Logger("Project-Beta", savetype="db")
    db_logger.info("This log is stored directly in the persistent DATABASE!")

    print("✅ Logs sent to the Dashboard! Check your browser and the side-bar.")

if __name__ == "__main__":
    main()
